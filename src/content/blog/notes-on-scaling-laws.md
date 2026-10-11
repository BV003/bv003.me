---
title: "Notes on Scaling Laws"
slug: "notes-on-scaling-laws"
pubDate: 2026-10-05
tags: ["Tech"]
---

本文用 n 表示模型的参数量。目前前沿模型的参数量已经到了 T（万亿）级别。

### 算力与参数量

训练一个模型需要的算力 C、训练数据量 D（token 数）和参数量 n 之间有一个经验公式：

$$C \approx 6nD$$

每个参数处理一个 token，前向传播大约需要 2 次浮点运算，反向传播大约需要 4 次，合计 6 次。

Chinchilla 的研究发现，在算力固定的前提下，D 和 n 应该同比例增长，大约 D ≈ 20n。代入上式，得到 C ∝ n²：模型扩大 10 倍，训练算力大约要扩大 100 倍。

### loss 与参数量

训练阶段的损失（loss）和 n、D 的关系可以拟合为：

$$L(n, D) = \underbrace{E}_{1.69} + \underbrace{\frac{406.4}{n^{0.34}}}_{\text{模型太小}} + \underbrace{\frac{410.7}{D^{0.28}}}_{\text{数据太少}}$$

E 是文本本身的不确定性，n 和 D 再大也降不下去。后两项分别是模型不够大、数据不够多带来的损失。n 和 D 同时扩大 10 倍，可以降低的那部分 loss（L − E）大约减半。

loss 和模型能力之间的关系并不确定。在已观测的范围内，loss 越低，模型能力通常越强，但这一关系能否外推到更大的规模，目前没有公开证据。loss 继续下降能否换来明显的能力提升，还不知道。

### 数据约束问题

按 D ≈ 20n 计算，1T 参数的模型需要约 20T token，10T 参数需要约 200T token。Epoch AI 估计公开的高质量人类文本约有 300T token，而目前主流模型已经用到 15T 到 40T，经过严格筛选的高质量数据（如 FineWeb，约 15T）已基本用尽。Epoch 预计公开文本将在 2026 到 2032 年间耗尽；为了降低推理成本，业界普遍让模型用远多于 20n 的数据训练，这会让耗尽的时间提前。

数据跟不上时，D 被固定，继续增大 n 只能降低公式里的 n 项，D 项停在原地，loss 的下降会更快趋于平稳。可能的出路包括：多轮重复训练（重复 4 轮以内，效果接近新数据）、合成数据、多模态数据，以及把算力转向 RL 后训练。

### 小结

只看参数量和预训练，模型能力的提升会越来越慢，很可能很快趋于平稳。但如何衡量模型能力本身仍是一个开放问题：loss 只是代理指标，benchmark 容易饱和，而后训练和推理时计算带来的能力提升，并不体现在预训练 loss 里。

### 参考

1. [claude的参数都达到25t了，为何国产模型最多还只有1t？知乎回答](https://www.zhihu.com/question/2029177725982613796/answer/2030759722475843817)（注：Anthropic 未公开过 Claude 的参数量）
2. [Training Compute-Optimal Large Language Models（Chinchilla）](https://arxiv.org/abs/2203.15556)
3. [Will we run out of data? Limits of LLM scaling based on human-generated data（Epoch AI）](https://arxiv.org/abs/2211.04325)
