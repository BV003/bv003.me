---
title: "Local and Private AI: Efficient and Scalable Systems for Intelligence at the Edge"
slug: "paper-reviews"
pubDate: 2026-10-02
tags: ["Tech"]
---


### The Theme

For a course, I need to read papers and write reviews. I wanted all eight papers to fit one theme:

**Local and Private AI: Efficient and Scalable Systems for Intelligence at the Edge**

| # | Direction |
|---|-----------|
| 1 | Small but Capable Models |
| 2 | Quantization & Model Compression |
| 3 | Sparse & Efficient Architectures |
| 4 | AI-Native Chips |
| 5 | On-device LLM Inference |
| 6 | Edge-Cloud Collaborative Inference |
| 7 | Federated Learning |
| 8 | Privacy-Preserving ML |

### Review 1: Small but Capable Models

#### [Qwen3 Technical Report](https://arxiv.org/abs/2505.09388)

I chose this paper because I am interested in how much intelligence can fit into a model small enough to run locally on a laptop or phone. The Qwen3 family is widely regarded as one of the strongest open-weight model families at small scale, and its 0.6, 1.7, and 4 billion parameter models are explicitly described by the authors as edge-side models. Reading its technical report is a good way to understand where small language models stand today and which technical ideas make that level of capability possible.

### Review 2: Quantization & Model Compression

#### [Deep Compression: Compressing Deep Neural Networks with Pruning, Trained Quantization and Huffman Coding](https://arxiv.org/abs/1510.00149)

I chose Deep Compression (ICLR 2016) because it is a foundational work in the area of model compression. It combines pruning, quantization, and Huffman coding to compress models dozens of times without loss of accuracy. It takes energy consumption as its starting point so that models can run efficiently on edge devices, which is highly consistent with this topic.

### Review 3: Sparse & Efficient Architectures

#### [Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity](https://arxiv.org/abs/2101.03961)

I chose Switch Transformer because it is the foundational work behind sparse architectures: it established the Mixture-of-Experts design now widely adopted by DeepSeek, Qwen, and GPT. I want to understand how a model can hold a very large number of parameters while activating only a small subset of them for each token, which is exactly the trade-off that lets a large language model run locally under a tight compute budget.

### Review 4: AI-Native Chips

### Review 5: On-device LLM Inference

### Review 6: Edge-Cloud Collaborative Inference

### Review 7: Federated Learning

### Review 8: Privacy-Preserving ML

### Conclusion
