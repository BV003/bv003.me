---
title: "Notes on Scaling Laws"
slug: "notes-on-scaling-laws"
pubDate: 2026-10-05
tags: ["Tech"]
---

In this post, n denotes the number of model parameters. Frontier models today have reached the trillion-parameter (T) scale.

### Compute and Parameters

There is an empirical formula relating the training compute C, the amount of training data D (in tokens), and the parameter count n:

$$
C \approx 6nD
$$

For each parameter and each token, the forward pass takes about 2 floating-point operations and the backward pass about 4, for a total of 6.

The Chinchilla study found that for a fixed compute budget, D and n should grow in proportion, roughly D ≈ 20n. Substituting this into the formula above gives C ∝ n²: making the model 10× larger requires roughly 100× more training compute.

### Loss and Parameters

The training loss can be fitted as a function of n and D:

$$
L(n, D) = \underbrace{E}_{1.69} + \underbrace{\frac{406.4}{n^{0.34}}}_{\text{model too small}} + \underbrace{\frac{410.7}{D^{0.28}}}_{\text{too little data}}
$$

E is the inherent uncertainty of the text itself; no amount of n or D can reduce it. The other two terms are the loss due to the model being too small and the data being too scarce. Scaling both n and D by 10× roughly halves the reducible part of the loss (L − E).

The relationship between loss and model capability is uncertain. Within the observed range, lower loss usually means a more capable model, but there is no public evidence on whether this holds at larger scales. Whether further drops in loss will bring meaningful capability gains remains unknown.

### Data Constraints

With D ≈ 20n, a 1T-parameter model needs about 20T tokens, and a 10T-parameter model about 200T tokens. Epoch AI estimates the stock of high-quality public human text at around 300T tokens. Leading models already train on 15T to 40T tokens, and strictly filtered high-quality data (e.g. FineWeb, about 15T) is largely used up. Epoch projects that public text will be exhausted between 2026 and 2032. To cut inference costs, the industry commonly trains models on far more than 20n tokens, which pulls that date earlier.

When data can't keep up, D is fixed. Growing n further only shrinks the n term in the formula while the D term stays put, so the loss flattens out sooner. Possible ways forward include training on repeated data for multiple epochs (up to about 4 epochs is nearly as good as fresh data), synthetic data, multimodal data, and shifting compute to RL post-training.

### Summary

Looking only at parameter count and pretraining, gains in model capability will keep slowing and may well plateau soon. But how to measure model capability is itself an open question: loss is only a proxy, benchmarks saturate easily, and the capability gains from post-training and test-time compute don't show up in pretraining loss.

### References

1. [Claude has reached 25T parameters — why do Chinese models top out at 1T? (Zhihu answer)](https://www.zhihu.com/question/2029177725982613796/answer/2030759722475843817)
2. [Training Compute-Optimal Large Language Models (Chinchilla)](https://arxiv.org/abs/2203.15556)
3. [Will we run out of data? Limits of LLM scaling based on human-generated data (Epoch AI)](https://arxiv.org/abs/2211.04325)
