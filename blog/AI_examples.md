---
layout: single
title: AI Examples in Mathematics
permalink: "/blog/ai-examples/"
katex: true
---

{% include footnotes.html %}

## What mathematical level are current AIs at?

Modern large models can do surprisingly non-trivial mathematics—both OpenAI and Google have reported IMO gold-level results on curated benchmarks. Are they already useful for research, though? That’s still [debated](https://x.com/g_leech_/status/1974165458283860198).

Here is a deliberately simple experiment: pick a clearly stated open question and give it *as is* to an AI system (no context besides a generic system prompt like “You are a research mathematician…”). Can the model produce a correct solution?

Sometimes—yes. Below are two small cases I obtained with GPT-5 (I expect Claude and Gemini could manage similar ones). Apart from the problem statements, the write-ups are 100% AI-generated.

These are not famous problems; they weren’t conjectured in peer-reviewed venues. They *are* genuine questions real people asked and didn’t immediately know how to solve. A competent human likely would have cracked them quickly. That’s the point: early progress often looks like “obvious in hindsight.” When the first chess engines scored notable wins, critics could fairly say the human blundered. Expect similar reactions here—yet the direction of travel is clear.

*(If you know other “single-shot” examples—model solves a posed problem without interactive steering—please send them.)*


## Example 1 — Tightness in 2D tilings

A recent paper studies tilings of \(\mathbb{R}^2\) by polygonal tiles and proves that **every such tiling is weakly periodic**: you can partition the plane into finitely many regions so that each region’s tiling is periodic.

> **Question.** Can we strengthen this to “every polygonal tiling is (globally) periodic”?

No. The model produced a concrete polygonal tiling that is weakly periodic but **not** periodic. In other words, the weak periodicity theorem is essentially tight for polygonal tilings.

- **PDF:** [Construction and argument](/assets/documents/tiling_solution.pdf).  
<footnote>The prompt mirrors the first question in the paper and initially considers a related product space; the example extends to \(\mathbb{R}^2\).</footnote>

**Intuition (one paragraph).** “Weakly periodic” allows stitching together a bounded number of periodic patterns along non-periodic boundaries; global periodicity forbids that. The construction encodes a finite set of periods on disjoint bands and arranges them so that no single global translation preserves the entire tiling, while each band remains periodic on its own. That separation is exactly what the theorem can’t rule out.


## Example 2 — How many parts do you need for \(k\) functions?

Here is a classical two-function fact with graph-theoretic applications.<footnote>First proven <a href="https://onlinelibrary.wiley.com/doi/abs/10.1002/jgt.10146">here</a>.</footnote>

Let \(f,g: E \to F\) with \(f(x)\neq g(x)\) for all \(x\in E\). Suppose there is an integer \(n\ge 1\) such that for every \(z\in F\), either \(|f^{-1}(z)|\le n\) or \(|g^{-1}(z)|\le n\). Then there is a partition
\[
E = E_1 \sqcup \cdots \sqcup E_{2n+1}
\]
such that \(f(E_i)\cap g(E_i)=\varnothing\) for each \(i\).

> **Question.** What happens for \(k\) functions? Is \(2n+1\) parts still enough?

No. The model gave a simple family showing that, in general, you need at least **\(kn\)** parts when you go from \(2\) to \(k\) functions.

- **PDF:** [One-page counterexample](/assets/documents/feghali_solution.pdf) (AI-written).

**Intuition (one paragraph).** Think of each function \(f_j\) creating “conflict points” where many elements of \(E\) want to map to the same \(z\in F\). The hypothesis caps how bad any *one* function’s congestion can be, but with \(k\) functions you can arrange \(k\) independent congestion centers. To keep \(f_j(E_i)\) and \(f_\ell(E_i)\) disjoint inside each part, the partition must isolate each congestion center at least \(n\) times—forcing \(\ge kn\) parts in the worst case.


## Why this matters (and what it doesn’t)

These are tiny results, not breakthroughs. But they *do* demonstrate the following: with a clean prompt and no iterative steering, current models can sometimes find correct constructions/counterexamples that settle small, well-posed questions. That’s qualitatively different from “assistant-mode” tutoring or proof-sketching with heavy human guidance.

If you try to reproduce: I include the PDFs; for serious claims one should also share prompts, model/version, temperature/seed, and transcripts. See suggestions below.
