---
title: "Paper Notes: SGLang"
slug: "sglang-blog"
pubDate: 2026-07-16
tags: ["Tech"]
---

### Citation

```
@misc{zheng2023efficiently,
      title={Efficiently Programming Large Language Models using SGLang},
      author={Lianmin Zheng and Liangsheng Yin and Zhiqiang Xie and Jeff Huang and Chuyue Sun and Cody Hao Yu and Shiyi Cao and Christos Kozyrakis and Ion Stoica and Joseph E. Gonzalez and Clark Barrett and Ying Sheng},
      year={2023},
      eprint={2312.07104},
      archivePrefix={arXiv},
      primaryClass={cs.AI}
}
```

### 

### Backend: Automatic KV Cache Reuse with RadixAttention
KV cache reuse means different prompts with the same prefix can share the intermediate KV cache and avoid redundant memory and computation. To systematically exploit these reuse opportunities, we introduce RadixAttention, a novel technique for automatic KV cache reuse during runtime.

In our system, we utilize a radix tree to manage a mapping. This mapping is between sequences of tokens, which act as the keys, and their corresponding KV cache tensors, which serve as the values.These KV cache tensors are stored on the GPU in a paged layout, where the size of each page is equivalent to one token.

### Frontend: Easy LLM Programming with SGLang

On the frontend, we introduce SGLang, a domain-specific language embedded in Python. It allows you to express advanced prompting techniques, control flow, multi-modality, decoding constraints, and external interaction easily. A SGLang function can be run through various backends, such as OpenAI, Anthropic, Gemini, and local models.