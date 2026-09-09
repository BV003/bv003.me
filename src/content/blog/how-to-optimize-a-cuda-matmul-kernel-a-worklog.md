---
title: "How to Optimize a CUDA Matmul Kernel: a Worklog"
slug: "how-to-optimize-a-cuda-matmul-kernel-a-worklog"
pubDate: 2026-09-08
tags: ["Tech"]
---

The blog is inspired by https://siboehm.com/articles/22/CUDA-MMM.

### Benchmark

We choose FLOPS as the only thing ot evaluate the kernel.

We record the time cuda needs, then we calculate the FLOPS.

### Autotuning

