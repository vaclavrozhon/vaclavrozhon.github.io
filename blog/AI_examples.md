---
layout: single
title: AI Examples in Mathematics
permalink: "/blog/ai-examples/"
katex: true
---

{% include footnotes.html %}

## What is the current mathematical level of AI?


I am interested in a clear-cut experiment. We have a clearly defined open problem in mathematics and an AI model. The only input to the model is the problem itself, possibly with some generic prompting ("You are a research mathematician..."). Can AI already solve such open problems?

It can. Here are two examples I found using GPT-5 (though Gemini and Claude would likely solve them too). The attached papers are also fully AI-written. It should be said that these two problems can only barely be called "open problems". They are not well-known and not even conjectured in a peer-reviewed article. Yet, these are questions a concrete person wondered about and did not know the solution to. Let me make it clear -- I believe that if a human researcher thought about these problems, they would likely solve them quickly.

Beginnings always look like this. Take [the first program that beat a chess grandmaster](https://en.wikipedia.org/wiki/HiTech). The legitimate reaction to this event was that the grandmaster was "badly off form". A similar reaction is sensible for the following examples. Nevertheless, I expect that in the coming months, we will see examples that look more and more legitimate.

Note: I don't know of other people showcasing examples of this kind. There are many recent examples of using AI to do math, but they typically involve more interactive processes or additional context beyond just the problem statement.


## Tightness of a recent paper on 2D tiling

There was a [recent very nice paper](https://arxiv.org/pdf/2408.02151) about tiling the plane $$\mathbb{R}^2$$ with polygonal tiles. One of the results shown in that paper was that every tiling of the plane with polygonal tiles is _weakly periodic_: it can be partitioned into finitely many pieces, each of them periodic.

Can this theorem be improved? Can we prove that every polygonal tiling is simply _periodic_? It turns out that the answer is no. AI can find a specific example of a polygonal tiling that is weakly periodic but not periodic.

The example is [here](/assets/documents/tiling_solution.pdf).<footnote>The question asked to the model is the question formulated in the first section of the paper and asks for example in a bit different space than $$\mathbb{R}^2$$, but it can be extended to $$\mathbb{R}^2$$.</footnote>  


## A counterexample to a problem about functions

Here's a cool fact about functions that has applications in graph theory.<footnote>First proven <a href="https://onlinelibrary.wiley.com/doi/abs/10.1002/jgt.10146">here</a>.</footnote>

Consider two functions $$f$$ and $$g$$ from a set $$E$$ into a set $$F$$ such that $$f(x) \not= g(x)$$ for every $$x \in E$$. Suppose that there exists a positive integer $$n$$ such that for any element $$z \in F$$, either $$|f^{-1}(z)| \le n$$ or $$|g^{-1}(z)| \le n$$.

Then $$E$$ can be partitioned into $$2n + 1$$ subsets $$E_1, E_2, \dots, E_{2n+1}$$ such that $$f(E_i) \cap g(E_i) = \emptyset$$ for each $$1 \le i \le 2n + 1$$.

Can we generalize this theorem to more functions? It is unclear how many sets would need to be in the partition if we generalize from $$2$$ functions to $$k$$ functions.

A particularly brave question was asked at KAMAK, the yearly retreat of combinatorics researchers from Charles University (first problem in [this booklet](https://kam.mff.cuni.cz/~kamak/static/problems/2020.pdf)). Maybe $$2n+1$$ sets is _still_ enough?

This turns out to be too optimistic. Given this problem, AI came up with a straightforward construction showing that if you generalize the problem to $$k$$ functions, you need to partition into at least $$kn$$ subsets.

[Here's the short proof](/assets/documents/feghali_solution.pdf) (fully AI-written).





