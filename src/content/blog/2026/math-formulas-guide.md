---
title: "Writing Math Formulas in Markdown"
slug: "math-formulas-guide"
pubDate: 2026-02-01
description: "A quick guide on how to write mathematical formulas in your blog posts using KaTeX."
---

This post demonstrates how to write mathematical formulas in your markdown files.

## Inline Math

You can write inline math using single dollar signs: $E = mc^2$

For example, the Pythagorean theorem is $a^2 + b^2 = c^2$.

## Block Math

For display math (centered on its own line), use double dollar signs:

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

## Examples

### Linear Algebra

The softmax function:

$$
\text{softmax}(x_i) = \frac{e^{x_i}}{\sum_{j=1}^{n} e^{x_j}}
$$

### Calculus

The gradient of a function:

$$
\nabla f(x, y, z) = \left(\frac{\partial f}{\partial x}, \frac{\partial f}{\partial y}, \frac{\partial f}{\partial z}\right)
$$

### Probability

Bayes' theorem:

$$
P(A|B) = \frac{P(B|A) \cdot P(A)}{P(B)}
$$

### Deep Learning

Transformer attention mechanism:

$$
\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$

## Syntax Reference

| Feature | Syntax | Example |
|---------|--------|---------|
| Inline math | `$...$` | `$x^2$` |
| Block math | `$$...$$` | `$$x^2$$` |
| Subscript | `_` | `$x_i$` |
| Superscript | `^` | `$x^2$` |
| Fraction | `\frac{a}{b}` | `$\frac{1}{2}$` |
| Square root | `\sqrt{x}` | `$\sqrt{2}$` |
| Sum | `\sum_{i=1}^{n}` | `$\sum_{i=1}^{n}$` |
| Integral | `\int_{a}^{b}` | `$\int_{0}^{1}$` |
| Greek letters | `\alpha, \beta, \gamma` | `$\alpha + \beta$` |

For more symbols, check the [KaTeX documentation](https://katex.org/docs/supported.html).



