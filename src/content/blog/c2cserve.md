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

### Key Ideas

C2CServe has three key ideas:

**① MIG + C2C for serverless LLM serving.** MIG provides fine-grained, hardware-isolated GPU slices for multi-tenant serving. C2C (~450 GB/s) extends each slice beyond its private HBM to a shared CPU-memory weight store. Model weights stay in CPU memory and are streamed on demand — no preloading, no HBM residency. Cold starts become cheap: just initialize runtime state, no weight transfer.

**② HybridGEMM: adaptive GEMM for heterogeneous memory.** Existing GEMM kernels (cuBLAS, CUTLASS) assume HBM-resident operands and use a single fixed dataflow. C2CServe instead uses two complementary GEMM strategies running on different SMs of the same MIG instance:
- **SymGEMM (output-stationary):** streams both X and W, writes partial O to HBM — stresses C2C but preserves GEMM efficiency.
- **AsymGEMM (weight-stationary):** keeps W in SMEM/L2 and reuses it across input tiles, accumulates O in HBM — reduces C2C traffic at the cost of extra HBM traffic.

A single knob α (the fraction of SMs assigned to SymGEMM) trades C2C traffic for HBM traffic per MIG slice, matching the current HBM/C2C bandwidth balance. The two paths write disjoint output columns so no synchronization is needed.

**③ Hierarchical scheduling with feedback control.** C2C bandwidth is shared across MIG instances. The scheduler coordinates three decisions: model placement (avoid co-locating large models on the same GPU), input chunk size (larger chunks → more weight reuse → less C2C pressure), and the HybridGEMM knob α. A feedback controller monitors TPOT/TTFT at runtime and adjusts α and chunk size to maintain SLOs under contention.

#### GEMM Shape Matters

For O(M,N) = X(M,K) × W(K,N) where X is in HBM and W is in CPU memory, M and N have opposite effects:
- **Larger M** (more tokens per chunk): each fetched weight tile is reused more times → better C2C amortization → higher efficiency.
- **Larger N** (hidden dimension): forces more weights to be fetched per tile → higher C2C pressure → C2C-bound.

This means chunk size and model size directly determine the bottleneck, which guides the scheduler's decisions.

#### Cross-Instance C2C Contention

Experiments show the interference gap (solo-run vs. co-run throughput) widens from 28% to 42% as total colocated model size grows from 5 GB to 44 GB. Larger parameter footprints mean more concurrent C2C fetches from different MIG instances, saturating the shared link. The scheduler uses model footprint as a signal to avoid co-locating heavy models.


### How It Works

![C2CServe Architecture](/images/architecture-c2cserve.png)

C2CServe has three runtime components:

**① Offline Kernel Builder.** Pre-compiles HybridGEMM variants for different precision × shape × MIG partition combinations. Each variant exposes the α knob. At initialization, α starts at 0 (all AsymGEMM, C2C-frugal).

**② Online Scheduler.** On each request, four steps:
1. If the model is already active on a MIG instance, route directly (no setup).
2. Else, pick an idle MIG instance — or evict a low-priority model if none is free. Placement respects a C2C budget: Σ BW_C2C(m) ≤ BW_avail, where BW_C2C(m) = S_m / TPOT_target.
3. Select chunk size from an offline profiling table. Larger chunks → better GPU utilization but more C2C pressure. The constraint: estimated HBM demand must stay within the MIG slice's HBM bandwidth.
4. Select initial α from the profiling table.

**③ Runtime Controller.** A feedback loop monitors latency, HBM utilization, and C2C utilization (smoothed via EMA). The tuning rule: if C2C utilization exceeds HBM utilization by more than threshold τ, decrease α (favor AsymGEMM to reduce C2C pressure). If HBM is more saturated, increase α (favor SymGEMM). This keeps TTFT/TPOT within SLO under dynamic multi-tenant contention. 

### Experiments & Results

**Setup.** GH200 Superchip (480 GB CPU, 96 GB HBM3, C2C ~900 GB/s), CUDA 12.8, PyTorch 2.7, built on mini-sglang. Models: Llama-3 (3B/8B/70B), Mixtral-8x7B, Qwen3-30B-A3B (BF16). Workload: Alibaba GenTD26 production trace (3.5M requests, 87 models, 3 weeks). Baselines: ServerlessLLM, Aegaeon (dense); MoE-Infinity, FineMoE (MoE). Metrics: p95 TTFT/TPOT, cold-start latency, model-switch latency.

**Full-GPU serving (Fig. 9).** C2CServe matches or beats baselines on dense models and enables Llama-70B where ServerlessLLM and Aegaeon OOM. On MoE, TTFT improved 3.0–7.2× over baselines; TPOT competitive.

**Cold-start latency (Fig. 10).** C2CServe reduces cold-start by up to 7.1× on dense models (vs. Aegaeon) and 4.6–5.0× on MoE (vs. MoE-Infinity/FineMoE). Also enables Llama-70B cold starts where others OOM.

**Model-switch latency (Fig. 11).** Under MIG, C2CServe switches in 50 ms (dense) / 318 ms (MoE), vs. 1.7 s / 12 s for ServerlessLLM — one to three orders of magnitude faster. Weights stay in pinned CPU memory; only runtime state is reinitialized.

**Dynamic workload (Fig. 12).** Under bursty trace replay, C2CServe keeps TTFT at 0.2–0.7 s (dense) and 0.5–0.8 s (MoE), meeting a 1 s SLO for 95% of requests. Baselines frequently spike to 2–10 s.

**Ablations (Fig. 13, 14):**
- **HybridGEMM alone** in existing systems: reduces TTFT 36–68%, enables Llama-70B on ServerlessLLM.
- **Bandwidth-aware placement** vs. random: 1.94× p99 TTFT reduction (1.24 s → 0.64 s).
- **Chunk-size control** vs. default: 2.83× p99 TTFT reduction (1.81 s → 0.64 s). Smoothes C2C burst pressure during prefill.
- **HybridGEMM α tuning** vs. static: 1.48× p99 TTFT reduction (0.95 s → 0.64 s). Static α overloads either C2C or HBM; runtime tuning balances both.

**Future hardware projection (Table 2).** C2CServe benefits from Superchip roadmap: Rubin's 3.2× CPU memory and 2× C2C bandwidth expand the CPU-resident model pool, offsetting the relative GEMM gap vs. HBM-resident execution.


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