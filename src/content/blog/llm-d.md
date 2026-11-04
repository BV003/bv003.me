---
title: "Llm-d Preview"
slug: "llm-d"
pubDate: 2026-11-4
tags: ["Tech"]
---

[llm-d](https://github.com/orgs/llm-d/repositories) is an open-source project for distributed LLM inference on Kubernetes. The organization has many repositories; here are the ones that matter.

### Core

- [llm-d](https://github.com/llm-d/llm-d): The main repo with architecture docs and deployment guides. The entry point to the project.
- [llm-d-router](https://github.com/llm-d/llm-d-router): Intelligent routing and scheduling, with KV-cache-aware routing and prefill/decode disaggregation.
- [llm-d-kv-cache](https://github.com/llm-d/llm-d-kv-cache): Distributed KV cache indexing, scheduling, and offloading.
- [llm-d-autoscaling](https://github.com/llm-d/llm-d-autoscaling): Autoscaling for inference workloads.

### Tools

- [llm-d-inference-sim](https://github.com/llm-d/llm-d-inference-sim): A vLLM simulator for development and testing without GPUs.
- [llm-d-benchmark](https://github.com/llm-d/llm-d-benchmark): Performance benchmarking.
- [llm-d-batch-gateway](https://github.com/llm-d/llm-d-batch-gateway): An OpenAI-compatible batch API.

The remaining repos are archived, templates, CI, or the website. You don't need them to understand the project.
