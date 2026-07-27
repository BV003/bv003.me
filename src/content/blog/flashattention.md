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
