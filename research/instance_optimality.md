---
layout: single # splash, single
title: Instance optimality
permalink: "/research/instance_optimality/"
katex: true
header:
    teaser: /assets/images/vv_alps.jpg
---

What does it mean that an algorithm is the best one for a given task? The usual approach is to compute the time complexity of the algorithm as the function of $n$, always considering *the worst possible* $n$-bit input. Very formally speaking, it means that our algorithm $A$ satisfies this:

$\exists \text{constant } C: \forall \text{other algorithm } A': \forall n: \max_{\text{$n$-bit input $I$}} \text{time}(A, I) \le C \cdot \max_{\text{$n$-bit input $I$}} \text{time}(A', I)$

For example, when we say that mergesort is the best possible algorithm for sorting (in the comparison model), this is what we have in mind. 

But we could be more adventurous. In fact, why shouldn't we try to construct algorithms that are the best possible on *every single input*? Such algorithms are called instance-optimal and formally, this is what instance optimality means: 

$\exists \text{constant } C: \forall \text{other algorithm } A': \forall I: \text{time}(A, I) \le C \cdot \text{time}(A', I)$

This definition seems extremely silly: how can we compare ourselves with algorithm *print(42)* on inputs where the output is 42? To fix that, we require in the definition of instance-optimality that $A'$ is correct on all inputs, not just $I$. But even then, how can we beat this algorithm (that hardcodes the correct answer 42 on my_favorite_input)?

```
if(input==my_favorite_input)
    print(42);
else 
    some_correct_algorithm(input);
```

In most cases, this algorithm indeed kills any hope for instance optimality, but it turns out that in many interesting scenario, checking whether *input == my_favorite_input* is too costly and we can thus keep the hope for achieving instance optimality or some variant of it. Here are some examples:

** Sampling-based algorithms

Here's a fundamental problem in statistics: There is some unknown distribution $D$ supported on $[0, 1]$ and we want to estimate its mean -- let's say that our output should be correct up to additive $\pm \epsilon$ error with 99% probability. 