---
title: "Paper Notes: C2CServe"
slug: "c2cserve"
pubDate: 2026-07-22
tags: ["Tech"]
---

### Citation

The paper named "C2CServe: Leveraging NVLink-C2C for Elastic Serverless LLM Serving on MIG" The work is done by people from UVA.


### Motivation

LLM serving is shifting toward **serverless**: large model catalogs, long-tail invocations, multi-tenant demand. Production traces (Alibaba, 89 models over three weeks) show 83% of models active <20% of the time, median model idle 96% — yet they must respond quickly to unpredictable bursts.

Existing approaches both fail:
- **Dedicated-GPU**: model stays warm in HBM → no cold start, but wastes GPU memory under sparse traffic.
- **GPU time sharing**: multiplexes models on one GPU → improves utilization, but switching models requires reloading GBs of weights over PCIe → heavy cold-start latency.

**MIG** (Multi-Instance GPU) offers a middle ground: hardware-partition one GPU into up to seven isolated slices. But each slice has too little HBM for modern LLM weights (even a full 96 GB GH200 can't hold a 70B model in BF16).

**The opportunity.** GH200/GB200 Superchips provide NVLink-C2C (~450 GB/s, ~7× PCIe). Fast enough that model weights can stay in CPU memory and be streamed on-demand to MIG slices via zero-copy — no need to preload into HBM. This decouples model residency from scarce HBM: MIG gives fine-grained compute, C2C gives abundant weight storage.

**The challenge.** Existing GEMM kernels assume HBM-resident operands — naïvely pointing them at CPU-resident weights causes repeated C2C fetches, saturating the shared interconnect. Worse, C2C bandwidth is shared across all MIG instances on a Superchip, so one tenant's weight streaming degrades another's. C2CServe asks: how to make MIG practical for serverless LLM serving under the shared C2C bottleneck?

### Background

Public model hubs already catalog over a million models, and production traces from large-scale inference platforms show a pronounced long tail: a small fraction of models receives most requests, while the remaining models must still remain responsive to unpredictable invocations. 

Existing GPU-based serving systems struggle to provide both **fine-grained allocation** and **low cold-start** overhead NVIDIA Multi-Instance GPU(MIG) appears to offer such a middle ground for serverless LLM serving. 


#### GEMM on MIG-Partitioned Superchips

Because the two operands come from different memory domains, matrix shape determines both HBM traffic and C2C pressure. O(M,N) = X(M,K) * W(K,N). Chunk Size directly corresponds to M (the partitioning dimension), while Total Size of Two Models (GB) corresponds to N and K (the dimensions of the weight matrices).

Superchip GEMM performance is bottleneck dependent: MIG partitioning changes the effective HBM C2C bandwidth balance, while matrix shape determines how well C2C traffic is amortized. High performance therefore requires an adaptive GEMM dataflow that jointly manages HBM and C2C traffic.

根据不同尺寸的矩阵进行动态调整。

#### Cross-Instance C2C Contention

**Impact of Parameter Footprint** As a result, parameter footprint becomes a first-order determinant of C2C traffic intensity. We quantify cross-instance interference as the gap between the sum of solo-run throughput and the co-run throughput. However, the co-run case degrades much more sharply than the solo baseline, and the interference gap widens from 28% to 42%. This is because larger colocated models generate more concurrent parameter-fetch traffic over C2C, increasing the likelihood of overlapping fetch streams across MIG instances.

This trend shows that larger parameter footprints cre-
ate greater pressure on the shared C2C link, making model
footprint a useful signal for scheduling. An intelligent sched-uler should therefore avoid co-locating models with large CPU-resident parameters on the same GPU, and instead use footprint-aware placement to reduce C2C contention and improve aggregate throughput.

**Impact of Execution Granularity** 


### Key Ideas

We observe that high-bandwidth CPU–GPU interconnects, such as NVLink-C2C (C2C) in NVIDIA GH200 and GB200 Superchips, change the memory constraint: model weights can reside in CPU memory and be streamed on demand to MIG instances ,shifting model residency from scarce HBM to abundant host memory. 

Together, MIG and C2C make LLM serverless practical: MIG provides fine-grained compute, while C2C extends each MIG instance beyond its private HBM partition to a larger CPU memory weight store.

Realizing this design requires rethinking two assumptions in today’s GPU software stack. First existing general matrix multiplication (GEMM) kernels such as cuBLAS and CUTLASS assume HBM-resident operands. Second, C2C sharing weakens MIG isolation. Co-resident MIG instances may stream CPU-resident weights concurrently, so each tenant’s effective C2C bandwidth depends on aggregate demand rather than its own partition. 

Specifically, C2CServe introduces HybridGEMM with key insight to trade C2C traffic for HBM traffic. HybridGEMM splits execution between an output-stationary（驻留） path that preserves GEMM efficiency and a weight-stationary path that reuses CPU-resident weights to reduce repeated C2C fetches.


### How It Works

![C2CServe Architecture](/images/architecture-c2cserve.png)

HybridGEMM therefore selects an execution mix that matches the current HBM–C2C band-width balance. The two paths run on different SMs and write disjoint columns of 𝑂, so they require no interstream synchronization. 

The optimal 𝛼 is runtime-dependent. 

### Experiments & Results



### Fundamental Underlying Technologies

#### Serverless

Serverless is a cloud execution model where the cloud provider dynamically manages resource allocation. Users deploy functions without provisioning or managing servers — the platform automatically scales resources up on demand and scales down to zero when idle. Key properties: **fine-grained billing** (pay per invocation, not per uptime), **auto-scaling** (elastic response to load spikes), and **cold starts** (latency penalty when an idle function is invoked, as the runtime must be initialized).

In the LLM serving context, serverless maps naturally to long-tail model catalogs: most models sit idle most of the time, but must respond quickly to bursty requests. The cold-start problem for LLMs is particularly severe because "initialization" means loading gigabytes of model weights and constructing CUDA graphs — far heavier than a typical container startup.

#### C2C

NVLink-C2C, Chip to Chip，封装内芯粒互联（MCM 多芯片模块），GPU/CPU 裸片封装在同一个芯片外壳里，毫米级短距离走线。

#### Input
Input 是用户实时推理数据（一句话、一张图），流程是：用户请求 → CPU 简单预处理 → 直接下发存入 GPU 本地 HBM。


#### Symmetric GEMM and Asymmetric GEMM

Symmetric 对称的含义：系统对输入矩阵X和权重矩阵W一视同仁，平衡两者的搬运、读取开销，不会刻意固定其中一个数据不动。计算时会交替搬运X和W到 GPU 计算单元，两者访问频次、数据搬运量基本对半分。Asymmetric GEMM 非对称数据流矩阵乘，固定权重矩阵 W 驻留在 GPU 片上缓存，全程不重复加载；只持续流式传入输入 X、流式写出累加输出 O，两个矩阵访存策略完全不对称。

#### 