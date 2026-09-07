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

###
https://siboehm.com/articles/22/CUDA-MMM

###
https://cudaforfun.substack.com/p/outperforming-cublas-on-h100-a-worklog