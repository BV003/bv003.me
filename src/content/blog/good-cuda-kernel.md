---
title: "How to write a good cuda kernel"
slug: "good-cuda-kernel"
pubDate: 2026-09-05
tags: ["Tech"]
---

Cuda is the bridge from hardware into software, I study how to write cuda by reading three blogs bellow.

### Blackwell GPU BF16 GEMM实现细节

Link: https://zhuanlan.zhihu.com/p/2079229753991741846

现在的GPU上优化一个基本的GEMM,可供自由调整的内容比较少，有
- Tile M/N的大小
- L2 swizzle大小
- 是否swap AB



https://siboehm.com/articles/22/CUDA-MMM

https://cudaforfun.substack.com/p/outperforming-cublas-on-h100-a-worklog