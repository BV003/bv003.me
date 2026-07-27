---
title: "Paper Notes: FlashAttention"
slug: "flashattention"
pubDate: 2026-07-27
tags: ["Tech"]
---

### Citation

The paper named "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness" is authored by Tri Dao, Daniel Y. Fu, Stefano Ermon, Atri Rudra, and Christopher Ré from Stanford University and University at Buffalo, SUNY.

arXiv: [2205.14135](https://arxiv.org/abs/2205.14135), 2022.

### Motivation

The self-attention mechanism in Transformers has a fundamental problem: its time and memory cost grows quadratically with sequence length. Double the sequence length → 4× the computation and memory. This makes long-context Transformers painfully slow and memory-hungry.

Previous attempts tried to fix this with approximate attention (sparse, low-rank, etc.) — trading accuracy for speed by doing less computation (fewer FLOPs). But here's the catch: they rarely achieved real wall-clock speedup. Why?

Because they were optimizing the wrong thing. On modern GPUs, the bottleneck is not computation — it's memory access. Think of it this way:

| | GPU HBM (the big memory) | GPU SRAM (on-chip cache) |
|---|---|---|
| Size | 40–80 GB | ~20 MB |
| Speed | 1.5 TB/s | 19 TB/s |
| | Big but slow | Tiny but blazing fast |

Standard attention reads and writes a giant N × N attention matrix to slow HBM — for a 4K sequence, that's a 16M-element matrix per attention head, every single layer. Most of the runtime is just waiting on memory, not computing.

The key insight: make attention IO-aware. Fuse all operations into one CUDA kernel, use tiling to compute attention block-by-block entirely in fast SRAM, and never write that giant N×N matrix to slow memory. The result? Exact attention (no approximation, no quality loss) that runs significantly faster. Same math, dramatically fewer memory trips.

### Background

The standard way to speed up memory-bound ops is **kernel fusion** — if you apply multiple operations to the same input, load it once, do all the ops, write once. Compilers can fuse elementwise ops (activation, dropout, mask) automatically.

But kernel fusion doesn't save attention. Why? Training needs the backward pass. Even if you fuse QKᵀ → softmax → PV in the forward pass, you still have to save S and P to HBM for the backward pass to compute gradients. Naive fusion just defers the write, it doesn't eliminate it.

FlashAttention's second trick (beyond tiling) is **recomputation**. Instead of storing S and P for backward, store only the output O and the softmax stats (m, ℓ). During backward, recompute S and P on-the-fly from Q, K, V blocks in SRAM. More FLOPs, but far fewer HBM accesses — and on modern GPUs, memory is the bottleneck, not compute.


### Key Ideas

FlashAttention has two core ideas:

1. **IO-aware tiling.** Split Q, K, V into blocks. Compute attention block-by-block entirely in fast SRAM using the online softmax trick. The N×N attention matrix never touches slow HBM.

2. **Recomputation for backward pass.** Traditional training saves the N×N matrices S and P forward for backward. FlashAttention only stores O and (m, ℓ) per row — then recomputes S and P on-the-fly in SRAM during backward. More FLOPs, but massively less HBM traffic.

The result: exact attention (no approximation), linear memory O(N) instead of O(N²), and wall-clock speedup up to 7.6× on attention alone.


### Experiments & Results

Key numbers to remember:

- GPT-2 small: **3.5× faster** training vs HuggingFace, **1.8×** vs Megatron-LM (same perplexity)
- BERT-large: **15% faster** than the MLPerf 1.1 training speed record
- Long-Range Arena: **2.4× faster** than standard attention
- Attention forward pass alone: up to **7.6× speedup** on GPT-2 medium
- Memory: **O(N) instead of O(N²)** — linear in sequence length, enabling sequences up to 64K tokens
- Block-sparse variant: **2-4× faster** than dense FlashAttention, proportional to sparsity ratio

All experiments on A100 GPUs. The IO complexity analysis also proves FlashAttention achieves Θ(N²d²/M) HBM accesses versus Θ(Nd + N²) for standard attention — up to 9× fewer HBM accesses in practice.

### Key Techniques

#### Forward vs. Backward Pass — A Quick Primer

Training a neural network has two phases each iteration:

**Forward pass:** Input data flows through the network, layer by layer. Each operation (matmul, softmax, etc.) produces an output. You keep intermediate values because the backward pass needs them.

```
Input → Layer1 → Layer2 → ... → Output → Loss
         ↑ intermediate values saved for backward ↑
```

**Backward pass:** Starting from the loss, you compute gradients flowing backward through the network. Each operation needs the forward pass's intermediate values to compute its gradient. The gradient tells you how to update parameters (Q, K, V projection weights) to reduce the loss.

```
Loss → ∇LayerN → ... → ∇Layer2 → ∇Layer1 → update weights
        ↑ uses saved intermediate values from forward ↑
```

For attention specifically:
- Forward needs to save S (N×N) and P (N×N) for backward to compute gradients w.r.t. Q, K, V
- This is the O(N²) memory cost — not output O (N×d), but the intermediates S and P

FlashAttention in the backward pass: instead of loading giant S and P from HBM, it re-runs the forward computation block-by-block in SRAM using stored O and (m, ℓ) to reconstruct S and P on the fly. Same gradients, no O(N²) storage.

#### What Are We Computing? (Q, K, V Attention)

Given input sequences Q, K, V, all of shape N × d (N = sequence length, d = head dimension), standard scaled dot-product attention is:

$$
S = QK^\top \in \mathbb{R}^{N \times N}, \quad
P = \text{softmax}(S) \in \mathbb{R}^{N \times N}, \quad
O = PV \in \mathbb{R}^{N \times d}
$$

That N × N attention matrix S (and its softmax P) is the culprit — for N = 4K tokens, that's a 16M-element matrix per head, per layer. FlashAttention's goal is to compute O exactly without ever storing S or P in full.

Now, which of these three steps actually need the tiling trick?

- **S = QKᵀ**: Matrix multiplication is naturally blockable.

  Here's why. Each element S[i][j] is an independent dot product: row i of Q × column j of Kᵀ (i.e., row j of K). No element needs to see any other element to be computed:

  ```
  S[i][j] = dot(query_of_token_i, key_of_token_j)
          = "how much does token i attend to token j?"
  ```

  So we can break the N×N matrix into smaller tiles. Partition Q into row blocks (each contains Bᵣ tokens' queries) and Kᵀ into column blocks (each contains Bc tokens' keys):

  ```
            Kᵀ (each column = one token's key, length d)
       ┌────────┬────────┐
       │  K₀    │   K₁   │    ← column blocks: 3 tokens' keys each
       └────────┴────────┘
  
  Q: ┌────────┐
     │  Q₀    │  ← row block: 3 tokens' queries
     ├────────┤
     │  Q₁    │  ← row block: 3 tokens' queries
     └────────┘
  
  S = ┌─────────────┬─────────────┐
      │Q₀K₀ᵀ (3×3)  │ Q₀K₁ᵀ (3×3) │  ← each tile computed independently
      ├─────────────┼─────────────┤
      │Q₁K₀ᵀ (3×3)  │ Q₁K₁ᵀ (3×3) │
      └─────────────┴─────────────┘
  ```

  To compute one tile, say Q₀K₀ᵀ: load Q₀ (3×d) and K₀ (3×d) into SRAM, do a small matrix multiply, produce a 3×3 tile of S. Then move to the next tile. The full N×N matrix never exists in memory all at once — we only need a Bᵣ × Bc tile at any moment.

  The underlying math is simply:

  $$
  S = QK^\top = \begin{bmatrix} Q_0 \\ Q_1 \end{bmatrix} \begin{bmatrix} K_0^\top & K_1^\top \end{bmatrix} = \begin{bmatrix} Q_0 K_0^\top & Q_0 K_1^\top \\ Q_1 K_0^\top & Q_1 K_1^\top \end{bmatrix}
  $$

  Standard attention didn't do this — not because it couldn't, but because it was pointless. After computing a tile of S, you'd have to dump it to HBM anyway, since the next step (softmax) needs the entire row. The tiling only becomes useful once softmax itself is also made blockable.

- **P = softmax(S)**: This is the *only* step that blocks tiling. softmax needs the entire row to compute the denominator Σexp(sᵢ). That's why standard attention dumps the full N×N matrix to HBM.
- **O = PV**: Also naturally blockable. Once you have a row of P, multiply with the corresponding column block of V.

So the bottleneck is solely softmax. If we can make softmax work incrementally on blocks, we can fuse the whole pipeline (QKᵀ → softmax → PV) into a single kernel that never writes the N×N matrix to slow memory.

#### Tiling: Block-by-Block Softmax

Softmax couples columns of K — the denominator forces you to see the whole row. FlashAttention breaks this by maintaining running statistics (m, ℓ) per row, so it can rescale partial results as new blocks arrive.

For a vector x, the numerically stable softmax is:

$$
m(x) = \max_i x_i, \quad
f(x) = \big[e^{x_1 - m(x)}, \dots, e^{x_B - m(x)}\big], \quad
\ell(x) = \sum_i f(x)_i, \quad
\text{softmax}(x) = \frac{f(x)}{\ell(x)}
$$

Now given two blocks of scores x<sup>(1)</sup> and x<sup>(2)</sup>, we can combine them without recomputing from scratch:

$$
m(x) = \max(m(x^{(1)}), m(x^{(2)}))
$$

$$
f(x) = \big[ e^{m(x^{(1)}) - m(x)} \cdot f(x^{(1)}), \; e^{m(x^{(2)}) - m(x)} \cdot f(x^{(2)}) \big]
$$

$$
\ell(x) = e^{m(x^{(1)}) - m(x)} \cdot \ell(x^{(1)}) + e^{m(x^{(2)}) - m(x)} \cdot \ell(x^{(2)})
$$

This means: as long as we keep (m, ℓ) per row as running statistics, we can process Q block by block against K/V blocks, rescale the partial output, and get the exact same result as if we had the full matrix. No need to ever materialize the N×N attention matrix in slow HBM.

#### The Complete Algorithm in Pseudocode

Putting it all together. Outer loop iterates over Q row blocks, inner loop iterates over K/V column blocks. All S and P tiles live and die entirely within SRAM:

```
# Outer loop: iterate over Q row blocks, one block loaded into SRAM at a time
for Q_block_idx in range(Tr):
    # ---- HBM → SRAM: load one Q block ----
    Q_block = load_from_HBM(Q, block_idx=Q_block_idx)

    # Per-row running stats, kept in SRAM throughout the inner loop
    for row in range(Br):
        m_global[row] = -inf
        l_global[row] = 0.0
        O_acc[row] = zeros(d)

    # Inner loop: iterate over K/V column blocks
    for KV_block_idx in range(Tc):
        # ---- HBM → SRAM: load one K block, one V block ----
        K_block = load_from_HBM(K, block_idx=KV_block_idx)
        V_block = load_from_HBM(V, block_idx=KV_block_idx)

        # Step 1: compute local S tile (Br × Bc) in SRAM
        S_local = Q_block @ K_block.T   # on-chip matmul

        # Step 2: compute local softmax stats per row
        for row in range(Br):
            m_local[row] = max(S_local[row, :])
            f_local[row] = exp(S_local[row, :] - m_local[row])
            l_local[row] = sum(f_local[row])

        # Step 3: online softmax rescaling — merge local stats into global
        for row in range(Br):
            m_new = max(m_global[row], m_local[row])
            scale_old = exp(m_global[row] - m_new)
            scale_new = exp(m_local[row] - m_new)
            l_global[row] = scale_old * l_global[row] + scale_new * l_local[row]
            m_global[row] = m_new

        # Step 4: compute weighted output and accumulate into O_acc
        for row in range(Br):
            P_local = scale_new * f_local[row] / l_global[row]
            O_local = P_local @ V_block    # on-chip matmul
            O_acc[row] = scale_old * O_acc[row] + O_local

        # S_local, m_local, f_local, l_local — freed, never leave SRAM

    # Inner loop done — O_acc for this Q block is final
    # ---- SRAM → HBM: write output block ----
    write_to_HBM(O_acc, O, block_idx=Q_block_idx)
```

Key data movement: Q, K, V blocks flow HBM → SRAM once. S_local and P_local tiles live entirely in SRAM. Only the final O blocks flow SRAM → HBM. The N×N attention matrix never exists in HBM.

#### Worked Example: End-to-End with Q, K, V

Let's trace through a tiny example. Suppose N=2, d=2, with these values:

```
Q = [[1, 0],        K = [[1, 2],       V = [[1, 0],
     [0, 1]]             [3, 4]]            [0, 1]]

token 0, row 0          token 0, row 0      token 0
         row 1                 row 1             token 1
```

**Step 1: S = QKᵀ** — compute tile-by-tile, never store full N×N.

Load Q block (both rows since tiny) and K block → compute S on-chip:

```
S = Q × Kᵀ = [[1,0],    [[1,3],    = [[1×1+0×2, 1×3+0×4],   = [[1, 3],
              [0,1]] ×   [2,4]]      [0×1+1×2, 0×3+1×4]]      [2, 4]]

Row 0: S₀ = [1, 3]
Row 1: S₁ = [2, 4]
```

S stays on-chip. Standard attention would write this to HBM now; FlashAttention keeps it in SRAM.

**Step 2: Softmax — the tiling trick.** Each row independently:

Row 0: scores = [1, 3]
```
m = max(1, 3) = 3
f = [e^(1-3), e^(3-3)] = [e⁻², 1] = [0.135, 1.0]
ℓ = 0.135 + 1.0 = 1.135
P₀ = [0.135/1.135, 1.0/1.135] = [0.119, 0.881]
```

Row 1: scores = [2, 4]
```
m = 4, f = [e⁻², 1] = [0.135, 1.0], ℓ = 1.135
P₁ = [0.119, 0.881]
```

P stays on-chip.

**Step 3: O = PV** — multiply on-chip, then write result to HBM.

```
O = P × V = [[0.119, 0.881],    [[1, 0],    = [[0.119, 0.881],
             [0.119, 0.881]] ×   [0, 1]]      [0.119, 0.881]]
```

**Key point:** S (N×N) and P (N×N) lived entirely in fast SRAM. Only Q, K, V (N×d) were loaded from HBM, and only O (N×d) was written back. For real-world N, this is the difference between O(N²) and O(N) memory traffic.
