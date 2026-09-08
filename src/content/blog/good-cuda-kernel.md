---
title: "How to write a good cuda kernel"
slug: "good-cuda-kernel"
pubDate: 2026-09-05
tags: ["Tech"]
---

Cuda is the bridge from hardware into software, I study how to write cuda by reading three blogs bellow.

### Blackwell GPU BF16 GEMM实现细节

Link: https://zhuanlan.zhihu.com/p/2079229753991741846

现在的GPU上优化一个基本的GEMM,可供自由调整的内容比较少，有
- Tile M/N的大小
- L2 swizzle大小
- 是否swap AB

Blackwell GEMM和Hopper GEMM相比，结构还是非常相似的，基本的优化概念包括：
- warp specialization
- multi-stage pipeline
- epilogue dataflow

除了这些基本概念稍微复习下，还有一些特殊的值得学习的点：
- 2sm Tensor Core指令和编程思维模型
- TMEM的理解和使用
- swap AB优化方法

#### warp specialization

Warp Specialization 是为了适应现代 GPU 硬件而出现的一种编程方式。现在 GPU 的数据搬运和计算越来越专业化，不能再只靠硬件自动调度把两者重叠起来，而是需要程序主动把不同任务分开：一部分 warp 专门负责搬数据，另一部分 warp 专门负责计算，让数据搬运和计算同时进行，从而充分利用 GPU 的不同硬件单元。

```
PRODUCER WARP (warp 0) data transportation
MMA WARP (warp 1) Matrix Multiply-Accumulate
EPILOGUE WARPS (warps 4-7) 
```

```
__global__ __launch_bounds__(NUM_THREADS, 1)
void gemm_kernel(
    const __grid_constant__ TmaDescriptor dA,
    const __grid_constant__ TmaDescriptor dB,
    const __grid_constant__ TmaDescriptor dC,
    int M, int N, int K,
    int num_tiles, int num_clusters)
{

    // ================================================================
    // INIT
    // ================================================================



    // ================================================================
    // PRODUCER WARP (warp 0)
    // ================================================================
    if (warp_idx == 0) {

    }

    // ================================================================
    // MMA WARP (warp 1)
    //
    // Same as Level 5, plus tensor core utilization control:
    // After each K-block's UMMA + commit, if TC_UTIL < 100:
    //   1. tcgen05.commit to tc_util_mbar (wait for UMMA completion)
    //   2. tc_util_mbar->wait (UMMA done)
    //   3. Spin for TC_DUMMY_CYCLES (let tensor cores cool)
    // ================================================================
    else if (warp_idx == 1) {
        
    }

    // ================================================================
    // EPILOGUE WARPS (warps 4-7)
    // ================================================================
    else if (warp_idx >= 4) {
        
    }

    // ================================================================
    // CLEANUP
    // ================================================================
}
```
#### epilogue dataflow: TMEM的理解
```
mma->TMEM
SMEM->TMEM
register->TMEM
TMEM->register
TMEM->TMEM
```

TMEM本身是128行x512列，每个元素是4字节。行的访问是直接映射到thread的。每一个行只有一个thread可以访问。所以想要一口气访问128行，一般就要4个warp一起。

#### 2SM 编程思维模型

2SM是真的把两个SM看成一组计算单元，在alloc TMEM，dealloc TMEM这些地方，都要用2SM版本的指令（cta_group::2）。

### How to Optimize a CUDA Matmul Kernel for cuBLAS-like Performance: a Worklog

Link: https://siboehm.com/articles/22/CUDA-MMM

Start with a naive kernel and step-by-step apply optimizations until we get within 95% of the performance of cuBLAS.

#### Kernel 1: Naive Implementation

Threads that are in the same block have access to the same shared memory region (SMEM).

#### Lower Bounding the Fastest Possible Runtime

For a matrix multiplication of two 4092² matrices, followed by an addition of a 4092² matrix.

- Total FLOPS: 2*4092³ + 4092² = 137 GFLOPS
- Total data to read (minimum!): 3 * 4092² * 4B = 201MB
- Total data to store: 4092² * 4B = 67MB


The GPU is advertised with 30TFLOPs/s of fp32 compute throughput and 768GB/s of global memory bandwidth. If we achieved those numbers, we’d need 4.5ms for the calculation and 0.34ms for the memory transfers. So in our napkin math, the calculation takes ~10x more time than the memory accesses. 

This means our final optimized kernel will be compute-bound, as long as we end up having to transfer <10x the absolute minimum memory volume of 278MB.

#### Memory Access Pattern of the Naive Kernel

In our kernel, two threads in the same block with ThreadIds (0, 0) and (0, 1) will load the same column of B but different rows of A. If we assume the worst case of zero caching, then each thread has to load 2*4092+1 floats from global memory. As we have 4092² threads total, this would result in 548GB of memory traffic.


#### Kernel 2: Global Memory Coalescing

The concept of a warp is relevant for this second kernel, as sequential memory accesses by threads that are part of the same warp can be grouped and executed as one. This is referred to as global memory coalescing. 

#### Kernel 3: Shared Memory Cache-Blocking

Physically, there’s one shared memory per SM.

In CUDA parlance, increasing per-block SMEM utilization can decrease occupancy. Occupancy is defined as the ratio between the number of active warps per SM and the maximum possible number of active warps per SM.

High occupancy is useful because it allows us to hide the high latency of our operations, by having a bigger pool of issue-able instructions available.

So this kernel is limited by the number of threads per block, and the number of registers per thread. We cannot load more than one block per SM, giving us a final occupancy of 32 active warps / 48 max active warps = 66%.


因此可以确定，我们的 warp 很大程度上是在等待 Shared Memory 访问完成。那么，如何让 kernel 发出更少的 Shared Memory 指令呢？一种方法是让每个 thread 计算多个 output element。这样，我们就可以把更多的计算和中间数据放到 register 中完成和保存，从而减少对 Shared Memory 的依赖。

#### Kernel 4: 1D Blocktiling for Calculating Multiple Results per Thread

Kernel 4 不再让“一个 thread 只算一个 C 元素”，而是让一个 thread 一次算 8 个 C 元素，从而大量减少 SMEM（Shared Memory）的重复读取，并把更多中间数据放进寄存器。一个 thread 不再只负责一个 C 元素，而是负责连续的 8 个 C 元素。B 只从 Shared Memory 读取一次，然后在寄存器里复用 8 次。

#### Kernel 5: Increasing Arithmetic Intensity via 2D Blocktiling

The basic idea for kernel 5 will be to compute a grid of 8*8 elements of C per thread. The first stage of the kernel is for all threads to work together to populate the SMEM cache. 

#### Kernel 6: Vectorize SMEM and GMEM Accesses

The first optimization that I already hinted at earlier is to transpose As. This will allow us to load from As using vectorized SMEM loads. Next, we’ll vectorize all loads and stores from/to GMEM using vector datatypes, namely float4. This leads to the 32b GMEM load instructions (LDG.E and STG.E) being replaced with 128b counterparts (LDG.E.128 and STG.E.128).

#### Kernel 9: Autotuning

We’ve accumulated a total of five template parameters:
- BM, BN and BK, which specify how much data we cache from GMEM into SMEM.
- TM and TN, which specify how much data we cache from SMEM into the registers.

Autotuning works, every high-performance library uses it, but it also feels very unsatisfying.

#### Kernel 10: Warptiling
Divides each Block's work among Warps, and then each Warp's work among its Threads.

### Outperforming cuBLAS on H100: a Worklog
Link: https://cudaforfun.substack.com/p/outperforming-cublas-on-h100-a-worklog