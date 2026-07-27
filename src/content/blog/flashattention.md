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


### Key Ideas


### How It Works


### Key Techniques

#### What Are We Computing? (Q, K, V Attention)

Given input sequences Q, K, V, all of shape N × d (N = sequence length, d = head dimension), standard scaled dot-product attention is:

$$
S = QK^\top \in \mathbb{R}^{N \times N}, \quad
P = \text{softmax}(S) \in \mathbb{R}^{N \times N}, \quad
O = PV \in \mathbb{R}^{N \times d}
$$

That N × N attention matrix S (and its softmax P) is the culprit — for N = 4K tokens, that's a 16M-element matrix per head, per layer. FlashAttention's goal is to compute O exactly without ever storing S or P in full.

Now, which of these three steps actually need the tiling trick?

- **S = QKᵀ**: Matrix multiplication is naturally blockable. Load a block (Bᵣ rows) of Q, a block (Bc columns) of Kᵀ, compute a Bᵣ × Bc tile of S — no need for the full N×N matrix.
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
