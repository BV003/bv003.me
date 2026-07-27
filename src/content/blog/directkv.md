---
title: "Paper Notes: DirectKV"
slug: "directkv"
pubDate: 2026-07-27
tags: ["Tech"]
---

### Citation

The paper named "No Buffer, No Bottleneck: Efficient Zero-Copy KV Cache Offloading for Long-Context LLMs" is authored from University of Virginia. Published at OSDI 2026.

### Motivation

Large Language Models (LLMs) generate a **KV cache** that grows linearly with sequence length, quickly exceeding GPU HBM (High Bandwidth Memory) capacity. This forces systems to either limit context length or offload the KV cache to CPU memory.

Existing KV cache offloading systems (FlexGen, Neo, Pie, etc.) share a fundamental inefficiency: they follow a **"separate kernel" pattern**:

1. **K/V Projection kernel** → writes K/V to CPU memory
2. Later, **Attention kernel** → re-fetches K/V from CPU memory back to GPU
3. This creates **redundant CPU–GPU transfers** of the same KV data

This is a **"staging" approach**: KV blocks are shuttled back and forth between CPU and GPU, wasting precious interconnect bandwidth and increasing latency.

The obvious fix would be **zero-copy** — let the GPU directly read KV cache from CPU-pinned memory without staging. But **naïve zero-copy performs terribly** because the **CPU–GPU interconnect bandwidth** (e.g., NVLink-C2C at ~450 GB/s per direction) is far lower than **HBM bandwidth** (~4 TB/s per direction). Conventional matrix multiplication tiling assumes all operands are in GPU memory and repeatedly re-fetches operands from wherever they reside — naïvely pointing attention kernels at CPU-resident KV tensors creates a **bandwidth bottleneck** at the CPU–GPU interconnect, stalling compute.

DirectKV asks: **Can we make zero-copy practical by redesigning attention kernels to shift bandwidth pressure away from the CPU–GPU interconnect onto HBM?** This motivates their kernel–memory co-design approach: CPU-memory-aware tiling (reuse CPU-fetched KV tiles maximally to shift data movement to HBM), kernel fusion (fuse K/V projection and attention into a single CUDA kernel to eliminate redundant writes and re-fetches), and warp-level pipelining (overlap communication with computation to hide memory latency).


### Background

Target hardware is the **NVIDIA Grace-Hopper (GH200)** superchip: a tightly coupled CPU-GPU architecture where the GPU connects to CPU memory via **NVLink-C2C** (~450 GB/s per direction). While much faster than PCIe, this bandwidth is still ~10× lower than HBM (~4 TB/s). The chip also provides **zero-copy** memory access — the GPU can directly read CPU-pinned memory without explicit `cudaMemcpyAsync` calls.

In standard LLM inference, each transformer layer produces **key (K) and value (V)** tensors during the attention step. These are stored in a **KV cache** to avoid recomputing them for every subsequent token. The KV cache size = `2 × num_layers × hidden_dim × sequence_length`. For a Llama-8B model at 32K context, this alone can consume tens of GB — pushing GPU memory to its limit.


### Key Ideas


### Experiments & Results


### Key Techniques
