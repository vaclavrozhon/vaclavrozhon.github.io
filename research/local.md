---
layout: single # splash, single
title: Local algorithms
permalink: "/research/local/"
katex: true
---

Think of a huge network like the Internet. Each node in this network (a router) is a tiny computer that can only see its immediate neighborhood. For simplicity, let's say that in one round, any node can send any message to its neighbors, receive their messages, and run some algorithm on them. This is the model of local algorithms. 

What kind of problems can and cannot be solved in this model? This is a question that many people have worked on since early 80's and we now have a pretty good understanding! It seems that having a good understanding of this question is very fundamental to understanding of not only distributed computing, but more generally all kinds of parallel, sublinear, or dynamic algorithm and even fundamental questions in graph theory, probability, and measure theory. 

I worked on a few aspects of local algorithms and also wrote an introductory text about them. 

- [Introductory text](#introductory-text)
- [Network decomposition](#network-decompositions)
- [Classification theorems](#classification-theorems)
- [Connections to other fields](#connections-to-other-fields)

## Introductory text
I wrote an [introductory text / survey](https://arxiv.org/pdf/2406.19430) about local algorithms. It's written for a younger version of myself, something that would hopefully bring me up to speed and made me able to understand papers in the area in a broader context. 

But also -- local algorithms are one of the precious few areas of computer science that we can understand better than just by having a bunch of techniques, algorithms, and important open problems. In local algorithms, we have a theory! For example, one of the most important recently-proved theorems says that each local problem is of one of four types, and for each type we can say something interesting. The problem is that this theorem was only proven in a long series of papers that used and developed all kinds of different techniques. Only taken together, a clear picture emerges. Hence the survey, which, as far as I can say, is the only place that proofs this particular theorems (and others) in one place. 

It also contains pictures!!

[
![survey](/assets/images/collage.png "Bunch of images from the survey")
](https://arxiv.org/pdf/2406.19430)


## Network decomposition

Network decomposition is a certain clustering problem that is extremely important to understanding local algorithms, especially if you want to understand what kind of problems can be solved in polylogarthmic number of steps but don't especially care about the difference between e.g. $\log n$- and $\log^5 n$-round algorithms (I explain this properly in the [survey](https://arxiv.org/pdf/2406.19430)). [In a paper](https://arxiv.org/abs/1907.10937) [with Mohsen Ghaffari](https://people.csail.mit.edu/ghaffari/), we constructed the first polylogarithmic deterministic algorithm for network decomposition. Subsequently, [Christoph Grunau](https://people.inf.ethz.ch/cgrunau/), Mohsen and others came up with a more principled way of solving the problem, which also resulted in faster (though also more complicated) algorithms, potentially culminating with [their 2024 paper](https://arxiv.org/abs/2410.19516).

![Network decomposition](/assets/images/decomp.png "An image from our network decomposition paper with Mohsen")

## Classification theorems

In some cases, we understand local algorithms so well that we can prove so-called classification theorems that basically prove that each reasonable problem can have only one of a few possible complexities. Such theorems are incredibly powerful -- when we encounter a new problem, it suffices to find out which category it belongs to, and then the general theorem tells us what the complexity of that problem is! I explained some of these theorems in the [survey](https://arxiv.org/pdf/2406.19430) and with [Christoph Grunau](https://people.inf.ethz.ch/cgrunau/), [Sebastian Brandt](https://scbrandt.github.io/) and others we have proved some small parts of these classification results in [a few](https://arxiv.org/abs/2202.04724) [papers](https://arxiv.org/abs/2006.04625) and extended them to some related models in [a few](https://arxiv.org/abs/2103.16251) [papers](https://arxiv.org/abs/2202.04724).  

![Around log star](/assets/images/logstar.png "An image from a paper closing some gaps in the problem complexities around log* n")

## Connections to other fields

[An amazing paper](https://arxiv.org/abs/2004.04905) of [Anton Bernshteyn](https://bahtoh-math.github.io/) showed that local algorithms can directly imply results in a much more abstract field of descriptive combinatorics that tries to understand uncountable objects equipped with measure. Together with [Jan Grebík](https://www.math.ucla.edu/~grebikj/), we set out to connect the two fields, together with the model of finitary factors coming from probability, using a kind of an abstract, complexity-theoretical approach ([here's](https://arxiv.org/abs/2103.14112) [some](https://arxiv.org/abs/2103.08394) [papers](https://arxiv.org/abs/2106.02066)). It really seems that there is some kind of underlying complexity theory of locality and we are in the process of revealing its facets. 

![Complexity theory of locality?](/assets/images/comp1.png "Complexity theory of locality?")

![Complexity theory of locality?](/assets/images/comp2.png "Complexity theory of locality?")

