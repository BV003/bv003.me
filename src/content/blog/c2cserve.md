---
title: "Paper Notes: C2CServe"
slug: "c2cserve"
pubDate: 2026-07-22
tags: ["Tech"]
---

### Citation

The paper named "C2CServe: Leveraging NVLink-C2C for Elastic
Serverless LLM Serving on MIG" The work is done by people from UVA.

### Background

Public model hubs already catalog over a million models, and production traces from large-scale inference platforms show a pronounced long tail: a small fraction of models receives most requests, while the remaining models must still remain responsive to unpredictable invocations. 

Existing GPU-based serving systems struggle to provide both **fine-grained allocation** and **low cold-start** overhead NVIDIA Multi-Instance GPU(MIG) appears to offer such a middle ground for serverless LLM serving. 



### Key Ideas

We observe that high-bandwidth CPU–GPU interconnects, such as NVLink-C2C (C2C) in NVIDIA GH200 and GB200 Superchips, change the memory constraint: model weights can reside in CPU memory and be streamed on demand to MIG instances, shifting model residency from scarce HBM to abundant host memory. 

Together, MIG and C2C make LLM serverless practical: MIG
provides fine-grained compute, while C2C extends each MIG
instance beyond its private HBM partition to a larger CPU-
memory weight store.

Realizing this design requires rethinking two assumptions
in today’s GPU software stack.