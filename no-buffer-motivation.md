### Motivation

Large Language Models (LLMs) generate a **KV cache** that grows linearly with sequence length, quickly exceeding GPU HBM (High Bandwidth Memory) capacity. This forces systems to either limit context length or offload the KV cache to CPU memory.

Existing KV cache offloading systems (FlexGen, Neo, Pie, etc.) share a fundamental inefficiency: they follow a **"separate kernel" pattern**:

1. **K/V Projection kernel** → writes K/V to CPU memory
2. Later, **Attention kernel** → re-fetches K/V from CPU memory back to GPU
3. This creates **redundant CPU–GPU transfers** of the same KV data

This is a **"staging" approach**: KV blocks are shuttled back and forth between CPU and GPU, wasting precious interconnect bandwidth and increasing latency.

The obvious fix would be **zero-copy** — let the GPU directly read KV cache from CPU-pinned memory without staging. But **naïve zero-copy performs terribly** because the **CPU–GPU interconnect bandwidth** (e.g., NVLink-C2C at ~450 GB/s per direction) is far lower than **HBM bandwidth** (~4 TB/s per direction). Conventional matrix multiplication tiling assumes all operands are in GPU memory and repeatedly re-fetches operands from wherever they reside — naïvely pointing attention kernels at CPU-resident KV tensors creates a **bandwidth bottleneck** at the CPU–GPU interconnect, stalling compute.

DirectKV asks: **Can we make zero-copy practical by redesigning attention kernels to shift bandwidth pressure away from the CPU–GPU interconnect onto HBM?** This motivates their kernel–memory co-design approach: CPU-memory-aware tiling (reuse CPU-fetched KV tiles maximally to shift data movement to HBM), kernel fusion (fuse K/V projection and attention into a single CUDA kernel to eliminate redundant writes and re-fetches), and warp-level pipelining (overlap communication with computation to hide memory latency).
