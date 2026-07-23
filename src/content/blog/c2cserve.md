---
title: "Paper Notes: C2CServe"
slug: "c2cserve"
pubDate: 2026-07-22
tags: ["Tech"]
---

### Citation

The paper named "C2CServe: Leveraging NVLink-C2C for Elastic
Serverless LLM Serving on MIG" The work is done by people from UVA.


### Motivation

### Background

Public model hubs already catalog over a million models, and production traces from large-scale inference platforms show a pronounced long tail: a small fraction of models receives most requests, while the remaining models must still remain responsive to unpredictable invocations. 

Existing GPU-based serving systems struggle to provide both **fine-grained allocation** and **low cold-start** overhead NVIDIA Multi-Instance GPU(MIG) appears to offer such a middle ground for serverless LLM serving. 


#### GEMM on MIG-Partitioned Superchips

Because the two operands come from different memory domains, matrix shape determines both HBM traffic and C2C pressure. O(M,N) = X(M,K) * W(K,N). Chunk Size directly corresponds to M (the partitioning dimension), while Total Size of Two Models (GB) corresponds to N and K (the dimensions of the weight matrices).

Superchip GEMM performance is bottleneck dependent: MIG partitioning changes the effective HBM C2C bandwidth balance, while matrix shape determines how well C2C traffic is amortized. High performance therefore requires an adaptive GEMM dataflow that jointly manages HBM and C2C traffic.

根据不同尺寸的矩阵进行动态调整。

#### Cross-Instance C2C Contention

**Impact of Parameter Footprint** As a result, parameter
footprint becomes a first-order determinant of C2C traffic
intensity.


### Key Ideas

We observe that high-bandwidth CPU–GPU interconnects, such as NVLink-C2C (C2C) in NVIDIA GH200 and GB200 Superchips, change the memory constraint: model weights can reside in CPU memory and be streamed on demand to MIG instances, shifting model residency from scarce HBM to abundant host memory. 

Together, MIG and C2C make LLM serverless practical: MIG provides fine-grained compute, while C2C extends each MIG instance beyond its private HBM partition to a larger CPU memory weight store.

Realizing this design requires rethinking two assumptions in today’s GPU software stack. First, existing general matrix multiplication (GEMM) kernels such as cuBLAS and CUTLASS assume HBM-resident operands. Second, C2C sharing weakens MIG isolation. Co-resident MIG instances may stream CPU-resident weights concurrently, so each tenant’s effective C2C bandwidth depends on aggregate demand rather than its own partition. 

Specifically, C2CServe introduces HybridGEMM with key insight to trade C2C traffic for HBM traffic. HybridGEMM splits execution between an output-stationary（驻留） path that
preserves GEMM efficiency and a weight-stationary path that reuses CPU-resident weights to reduce repeated C2C fetches.
### How It Works

### Evaluation

### Takeaways

### Key Techniques

#### C2C

NVLink-C2C, Chip to Chip，封装内芯粒互联（MCM 多芯片模块），GPU/CPU 裸片封装在同一个芯片外壳里，毫米级短距离走线。

#### Input
Input 是用户实时推理数据（一句话、一张图），流程是：用户请求 → CPU 简单预处理 → 直接下发存入 GPU 本地 HBM。


#### Symmetric GEMM and Asymmetric GEMM

Symmetric 对称的含义：系统对输入矩阵X和权重矩阵W一视同仁，平衡两者的搬运、读取开销，不会刻意固定其中一个数据不动。计算时会交替搬运X和W到 GPU 计算单元，两者访问频次、数据搬运量基本对半分。Asymmetric GEMM 非对称数据流矩阵乘，固定权重矩阵 W 驻留在 GPU 片上缓存，全程不重复加载；只持续流式传入输入 X、流式写出累加输出 O，两个矩阵访存策略完全不对称。