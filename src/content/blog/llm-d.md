---
title: "Llm-d Preview"
slug: "llm-d"
pubDate: 2026-11-4
tags: ["Tech"]
---

[llm-d](https://github.com/orgs/llm-d/repositories) is an open-source project for distributed LLM inference on Kubernetes. The organization has many repositories; here are the ones that matter.

![llm-d Core Repositories](/images/llm-d.png)

### Core

- [llm-d](https://github.com/llm-d/llm-d): The main repo with architecture docs and deployment guides. The entry point to the project.
- [llm-d-router](https://github.com/llm-d/llm-d-router): Decides which pod gets each request. It also holds the global KV cache index, so requests go to pods that already cache their prefix.
- [llm-d-autoscaling](https://github.com/llm-d/llm-d-autoscaling): Decides how many pods to run. It provides KEDA blueprints that scale vLLM based on Prometheus metrics.

### Tools

- [llm-d-inference-sim](https://github.com/llm-d/llm-d-inference-sim): A vLLM simulator for development and testing without GPUs.
- [llm-d-benchmark](https://github.com/llm-d/llm-d-benchmark): Performance benchmarking.
- [llm-d-batch-gateway](https://github.com/llm-d/llm-d-batch-gateway): An OpenAI-compatible batch API.
- [llm-d-kv-cache](https://github.com/llm-d/llm-d-kv-cache): Supporting KV cache utilities, such as a tokenizer service and a PVC evictor. Its main parts have moved: the KV cache index to llm-d-router, and storage offloading upstream to vLLM.

The remaining repos are archived, templates, CI, or the website. You don't need them to understand the project.

