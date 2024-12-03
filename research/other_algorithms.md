---
layout: single # splash, single
title: Other algorithms
permalink: "/research/other_algorithms/"
katex: true
---

I enjoy working on all kinds of algorithms. 

## Parallel shortest paths

We have the super-efficient Dijkstra's algorithm for the problem of finding the shortest path in a graph. But here's a question, is there a parallel algorithm for this problem? For a long time, there was no known algorithm for this problem that would keep reasonable (near-linear) total work and had nontrivial (truly sublinear) depth. In a [paper](https://arxiv.org/abs/2210.16351) with [Christoph Grunau](https://people.inf.ethz.ch/cgrunau/), [Bernhard Haeupler](https://people.inf.ethz.ch/haeuplb/), [Anders Martinsson](https://as.inf.ethz.ch/people/members/maanders/index.html), [Goran Zuzic](https://goranzuzic.github.io/), we showed that there is really an algorithm with near-linear work and about $$\sqrt{n}$$ depth by reducing the problem to the approximate variant where an algorithm was already known.  

![smoothing](/assets/images/smoothing.png "Parallel shortest paths")

In other [two](https://arxiv.org/abs/2204.05874) [papers](https://arxiv.org/abs/2204.08254) with [Christoph Grunau](https://people.inf.ethz.ch/cgrunau/), [Bernhard Haeupler](https://people.inf.ethz.ch/haeuplb/), [Michael Elkin](https://www.cs.bgu.ac.il/~elkinm/), [Jason Li](https://q3r.github.io/), and [Goran Zuzic](https://goranzuzic.github.io/), we first showed that on undirected graphs, the approximate shortest path problem can really be solved in near-linear time and polylogarithmic depth, and then showed how this can be used to solve bunch of other problems in the same time. The upshot is that a lot of graph problems can be solved with near-linear time algorithms that are near-optimally parallelizable. 

![clustering](/assets/images/parallel_clustering.png "Parallel algorithm for clustering")

## Parallel derandomization

One big computer science question is this: if there is a fast randomized algorithm for some problem, is there also a fast deterministic algorithm for it? Though we don't know the answer, we have a bunch of quite general techniques like the method of conditional expectations. In a [paper](https://arxiv.org/abs/2311.13764) with [Mohsen Ghaffari](https://people.csail.mit.edu/ghaffari/) and [Christoph Grunau](https://people.inf.ethz.ch/cgrunau/), we show a quite general way of implementing this method in parallel; this makes it a bit more plausible that one can not only efficiently derandomize algorithms, but also keep their depth. 

## Consistent k-center

Let's say that I want to compute some clustering on a set of points $$X$$; to be concrete, let's say I want to solve the k-center problem. The twist is that every day, $$X$$ gets updated -- either one new point arrives or one point from it is removed. The field of dynamic algorithms is about solving the problem of quickly updating my solution every day. But there's even more basic question you can ask: after each update, is it possible to change only a few clusters each day and preserve that each day, my solution approximates the current optimum? This property is called consistency and in a [paper](https://arxiv.org/abs/2307.13747) with [Christoph Grunau](https://people.inf.ethz.ch/cgrunau/), [Bernhard Haeupler](https://people.inf.ethz.ch/haeuplb/), [Rajesh Jarayam](https://rajeshjayaram.com/), and [Jakub Lacki](https://www.mimuw.edu.pl/~jlacki/) we showed that it is achievable for the k-center problem. In fact, swapping two centers each day suffices. Our algorithm was soon superceded by better ones. 

![kcenter](/assets/images/kcenter.png "Hierarchical algorithm for consistent k-center")