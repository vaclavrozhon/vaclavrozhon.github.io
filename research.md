---
layout: single # splash, single
title: Research
permalink: "/research/"
katex: true
header:
    teaser: /assets/images/vv_alps.jpg
---

I have the full list of publications [here](/research/papers/) or at [Google Scholar](). But I think that I can convey more information by briefly describing some selected projects I worked on. [^honesty] In the following sections, each header/picture links to a separate page discussing the topic at greater length. 


- [Local algorithms](#local-algorithms)
- [Instance optimality](#instance-optimality)
- [Practical k-means algorithms](#practical-k-means-algorithms)
- [Various algorithms](#various-algorithms)
- [Discrete math](#earlier-work)

## [Local algorithms](/research/local/)

Local algorithms are a simplified model of algorithms that aims to underpin some fundamental principles of distributed, parallel, or sublinear algorithms. I am pretty certain that local algorithms will play a crucial role in whatever unifying theory of these algorithmic setups we end up having. 

During my PhD, I worked a lot on local algorithms, both in terms of extending the theory behind them and linking it to other other areas in computer science and mathematics. 
The necessity of writing some kind of thesis then motivated me to write [an introductory text / survey about local algorithms](https://arxiv.org/pdf/2406.19430). The text presents an overview of the field and is intended for beginning researchers or researchers from adjacent areas. 

[
![survey](/assets/images/collage.png "Bunch of images from the survey")
](/research/local/)


## [Instance optimality](/research/instance_optimality/)

Instance optimality is pretty much the strongest guarantee that an algorithm can have; roughly speaking, it says that the algorithm is best possible not only if you measure its complexity as the function of the input size (that would be the classical worst-case complexity), but it's even the best possible algorithm on *every* possible input. This guarantee is so extremely strong that it is usually quite simple to see that it's impossible to achieve it.

Yet, in some models of computation, like distributed algorithms, comparison-based algorithms, or sampling algorithms, instance optimality (or its cousins like universal optimality) are achievable! This makes those areas some kind of happy algorithmic places where we can almost dare to say that we understand what's going on. 

Somehow, one of our instance-optimality results on Dijkstra's algorithm won the FOCS best paper award and was featured in [Quanta Magazine](https://www.quantamagazine.org/computer-scientists-establish-the-best-way-to-traverse-a-graph-20241025/) and [Wired](https://www.wired.com/story/scientists-establish-the-best-algorithm-for-traversing-a-map/). 

[
![quanta picture](/assets/images/quanta.png "A picture from Quanta magazine")
](/research/instance_optimality/)
<small>A picture from [Quanta magazine](https://www.quantamagazine.org/computer-scientists-establish-the-best-way-to-traverse-a-graph-20241025/).</small>


## [Practical k-means algorithms](/research/kmeans/)

Clustering is one of the most basic tasks in statistics or machine learning. And the the most basic way of doing it is $$k$$-means. There is an enormous theoretical literature on the $$k$$-means problem, but the algorithms that came out of it are mostly not implemented in practice. In a series of papers with [Christoph Grunau](https://people.inf.ethz.ch/cgrunau/) and others, we analyzed some algorithms that *are* used in practice, and developed some new ones that seem to be practical. 

One highlight is our proof that if you use the $$k$$-means algorithm implemented in Sci-kit learn library, it works in the sense that the solution that the algorithm outputs can never be too far from optimal. 

[
![outliers](/assets/images/outliers.png "Algorithms for k-means with outliers")
](/research/kmeans/)


## [Various algorithms](/research/other_algorithms/)

I enjoy working on all kinds of algorithmic topics.  

[
![smoothing](/assets/images/smoothing.png "Parallel shortest paths")
](/research/other_algorithms/)

## [Discrete math](/research/discrete_math/)

I did some discrete math research in undergrad. Most of it is related to extremeal graph theory -- area studying various parameters of graphs by asking questions like "If a graph has $$n$$ vertices and $$m$$ edges, what's the minimal and maximum number of triangles it can have?" More concretely, I did some research on graph homomorphisms and tree embedding. 

[
![Trees](/assets/images/trees.png "Finding trees in graphs")
](/research/discrete_math/)




--- 

[^honesty]: More honestly, I am writing this after I've finished my PhD, trying to look back and wondering how to think of my research so far and what to focus on next. 
