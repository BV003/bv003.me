---
title: "Paper Notes: DYNAFLOW"
slug: "dynaflow"
pubDate: 2026-07-08
tags: ["Tech"]
---

### DYNAFLOW

The paper named 'DYNAFLOW: TRANSPARENT AND FLEXIBLE INTRA-DEVICE PARALLELISM VIA PROGRAMMABLE OPERATOR SCHEDULING'.
And the link is https://arxiv.org/abs/2605.21603. The work is done by people from UW and SJTU.


### Motivation

GPUs waste lots of resources when running LLMs — one operator uses compute cores while memory bus sits idle. Intra-device parallelism fixes this by running different operators at the same time to fully use GPU hardware. But existing ML frameworks are built for sequential code. To add intra-device parallelism, developers have to rewrite huge chunks of model code, which takes months and costs massive engineering work. 

What's more, No single parallel strategy works everywhere. The best way to overlap operators changes based on model size, input workload, and GPU hardware. Developers must build and maintain many separate custom codes for different scenarios.



### Background

Models are shifting from purely compute-bound to a sequence of operators with highly diverse resource requirements. Such as compute-bound operators(matrix multiplications), memory-bound operators
like decode attention, network-bound like communication.

Recent research has explored intra-device parallelism, a class of strategies that aims to maximize resource utilization within a single device. Techniques such as overlapping computation with communication, fine-grained kernel fusion, or further splitting the input batch for concurrent execution have shown significant throughput improvement.

Modern fast LLM inference systems such as vLLM and SGLang are designed to run operations one after another. But single-GPU parallel computing needs to run multiple tasks at the same time, which clashes with their original design. So adding intra-device parallel support means massive, disruptive code changes. 

On top of the huge coding work already needed, there’s another big problem: there’s no one-size-fits-all parallel strategy. How well a strategy works depends entirely on your model, input batch size, and GPU hardware. Since every scenario needs its own custom implementation, developers have to build and maintain many separate pieces of code, making the engineering workload even heavier.

### Key Ideas

Key idea for solving these challenges is to decouple operator execution from the model implementation. The paper proposes a new programmable execution substrate. It supports flexible parallel operator scheduling without changing model definitions.

DynaFlow is implemented as a torch.compile backend to support transparent integration with all PyTorch-based systems. Torch.compile is a built-in PyTorch compiler. It takes original model code, converts it into optimized GPU code.

### How It Works

### Evaluation



### Takeaways

### System Paper

I have done some research in AI, but this is my first time reading a system paper.


### Key Techniques

In this section, I will describe techniques the paper mentioned.

#### Mixture-of-Experts (MoE) 
MoE splits FFN into multiple independent sub-networks called experts, each token is routed to only a small subset of experts. Shared Expert is a universal FFN branch that runs for all tokens, no routing needed.
It is always executed alongside the routed unique experts to improve model quality.

```
            Input Token
                 |
                 v
       ┌─────────┴─────────┐
       |                   |
       v                   v
   ┌─────────┐     ┌──────────────┐
   │ Shared  │     │   Router     │  ← Runs concurrently
   │ Expert  │     └──────┬───────┘
   └────┬────┘            |
        |            ┌────┼────┐
        |            ▼    ▼    ▼
        |          ┌──┐ ┌──┐ ┌──┐
        |          │E0│ │E1│ │E2│     ← Top-K routed experts
        |          └┬─┘ └┬─┘ └┬─┘
        |           └────┼────┘
        |                |
        v                v
       ┌───────────────────┐
       │  y = Shared(x) +  │
       │    Σ Routed(x)    │
       └───────────────────┘
```


