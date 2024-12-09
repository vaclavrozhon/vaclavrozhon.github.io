---
layout: single # splash, single
title: Discrete math
permalink: "/research/discrete_math/"
katex: true
header:
    teaser: /assets/images/vv_alps.jpg
---

I did some discrete math research in undergrad. Most of it is related to extremeal graph theory -- area studying various parameters of graphs by asking questions like "If a graph has $$n$$ vertices and $$m$$ edges, what's the minimal and maximum number of triangles it can have?" More concretely, I did some research on graph homomorphisms and tree embedding. 

## Alternative characterization of graph norms

Extremal graph theory is largely about studying parameters of graphs and how they relate to each other. For example, given a large graph, we might be interested in its density of triangles, four-cycles or, more generaly, the density of some small graph $$H$$ in it. However, not all graphs $$H$$ are created equal, only the density of some of them has nice mathematical properties. 

One of the most basic properties is that the density behaves as a norm -- these graphs $$H$$ are called *weakly norming*. A related property, called *step Sidorenko property*, roughly speaking says that if you make a large graph look more random, the density of $$H$$ in it goes down. In a paper with [Martin Doležal](https://www.math.cas.cz/index.php/members/researcher/204), [Jan Grebík](https://www.math.ucla.edu/~grebikj/), [Jan Hladký](https://www.cs.cas.cz/~hladky/), and Israel Rocha, we proved that these two properties are actually equivalent!

![Norming graphs](/assets/images/norming.png "Norming graphs")

## Graphs that contain every tree

In [two](https://arxiv.org/pdf/1802.00679) [papers](https://arxiv.org/abs/1804.06791) with [Tereza Klimošová](https://kam.mff.cuni.cz/~tereza/) and [Diana Piguet](https://www.cs.cas.cz/staff/piguet/cs), we studied what kind of graphs have the property that they contain all trees on $$k$$ vertices. For example, there's a famous Erdos-Sos conjecture that states that graphs of average degree at least $$k$$ should have this property; a result in [this paper](https://arxiv.org/abs/1804.06791) implied a weaker, approximate, version of that conjecture. 

![Trees](/assets/images/trees.png "Finding trees in graphs")