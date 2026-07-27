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

#### Tiling: Block-by-Block Softmax

The core challenge: softmax requires the entire row of the attention matrix to compute denominators, so naively you'd need the full N×N matrix in memory. FlashAttention solves this by decomposing softmax to work incrementally on blocks.

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

#### Worked Example: Softmax Over Two Blocks

Let's make this concrete. Say we have a row with 4 scores split into two blocks:

Block 1: scores = [2, 1]
Block 2: scores = [3, 0]

First, process Block 1 alone:

```
m₁ = max(2, 1) = 2
f₁ = [e^(2-2), e^(1-2)] = [1, 0.368]
ℓ₁ = 1 + 0.368 = 1.368
partial_output₁ = f₁ / ℓ₁ = [0.731, 0.269]
```

Now Block 2 arrives. Combine with stats from Block 1:

```
m₂ = max(3, 0) = 3
m_new = max(m₁, m₂) = max(2, 3) = 3

// Rescale old stats to align with the new max:
ℓ_new = e^(2-3) × ℓ₁ + e^(3-3) × (e^(3-3) + e^(0-3))
      = e^(-1) × 1.368 + 1 × (1 + e^(-3))
      = 0.368 × 1.368 + 1 × 1.050
      = 0.503 + 1.050 = 1.553

f_new = [e^(2-3) × f₁,  e^(3-3) × f₂]
      = [0.368 × (1, 0.368),  1 × (1, 0.050)]
      = [(0.368, 0.135),  (1, 0.050)]

final_softmax = f_new / ℓ_new
              = [0.237, 0.087, 0.644, 0.032]
```

Let's verify against the naive approach — softmax([2, 1, 3, 0]) all at once:

```
e²=7.389, e¹=2.718, e³=20.086, e⁰=1
sum = 31.193
result = [7.389/31.193, 2.718/31.193, 20.086/31.193, 1/31.193]
       = [0.237, 0.087, 0.644, 0.032] ✓ Identical!
```

The key takeaway: by keeping just two numbers (m, ℓ) as running state, we can stream through blocks one at a time, rescaling on the fly, and get the exact same softmax answer. This is what lets FlashAttention keep everything in fast SRAM — each block computes its piece, rescales the accumulated output, and moves on. No N×N matrix ever hits slow memory.
