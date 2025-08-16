---
title: "Appendix to the Radix‑Sort Video"
date: 2025-08-15
tags: [algorithms, radix-sort, floating-point, ieee-754, data-structures, word-ram, history]
---

{% include footnotes.html %}
{% include katex.html %}

These are the bonus notes about our [radix sort video](https://www.youtube.com/watch?v=Y95a-8oNqps) that didn't fit into the video cut.


## More on floats

Try to play with the following widget (clickable squares). It showcases the full minifloat format, including all the technicalities we did not tell you about. Like:

{% include polylog/radixsort/bit-explorer.html %}

- the number 0 can be represented both as "+0" and "-0" 
- the largest exponent "1111" does not encode 15, but infinity, at least when the mantissa bits are "000". The sign encodes whether its +∞ or -∞. 
- if the exponent is "1111" and mantissa bits are nonzero, we encode [NaN](https://en.wikipedia.org/wiki/NaN). 
- the smallest exponent "0000" includes so-called [subnormal numbers](https://en.wikipedia.org/wiki/Subnormal_number) -- for those, the mantissa XYZ is not interpret as 1.XYZ, but as 0.XYZ. 


- One nice thing about this is that infinities and subnormal numbers still allow us to use our integer<->float trick! NaNs will end up being even larger than infinities. 
- Careful! Our trick does not extend to negative numbers. That's because integers handle negative numbers using the complement format (see above widget), while floats simply store it as the first bit. It's not the end of the world though, it means that after running the unsigned-integer-radixsort for both positive and negative numbers, we have to go through the output sequence one more time, and do some small post-processing to put it in sorted order.  

## Float formats

The “minifloat” in the script is mostly a teaching toy; but the same idea scales. Here are the floats you might encounter. 

- *binary32* (**float**): 1/8/23. This is perhaps the legacy implementation -- and often just called "the float". But I'm not sure how often this is used these days -- modern CPUs are optimized well for 64-bit format, while GPUs often need smaller (see below). 
- *binary64* (**double**): 1/11/52. In C, C++, Java, JavaScript, Python, etc., the literal 1.23 is a double unless you explicitly write 1.23f. If you have to work with floating point numbers, you are entering a huge can of worms. For example, in competitive programming, your program can sometimes give wrong answer just because of the rounding errors made by the float. Using double is not much slower than using floats on CPUs, so it's pretty much for free. 
- *bfloat16*: 1/8/7. This is popular in deep learning. Neural networks are anyway super noisy by design, so introducing small rounding errors doesn't really matter<footnote>This holds for training and even more so for inference</footnote>. The nice property of bfloat16 is that it has the same-sized exponent as float, so rounding floats to this format is super fast. There are all kinds of similar formats used for deep learning, see e.g. [the wiki page about bfloat16](https://en.wikipedia.org/wiki/Bfloat16_floating-point_format). 

![Floating-point format bit layouts](/assets/images/polylog/floating-point-formats.png)


## How did 1960s machines sort letters?

Here's a fun fact -- if you look closely at the IBM 083 machine, you will see that the bucket with 9 also has IRZ written next to it.  

![1958 punched card sorting machine with "9 I R Z" label highlighted](/assets/images/polylog/card-sorting-machine-labeled.png)

Here's the full table:

| Pocket (digit row) | Label contents |
|--------------------|-----------------| 
| 0                  | 0 space      |
| 1                  | 1 A J S        |
| 2                  | 2 B K T        |
| 3                  | 3 C L U        |
| 4                  | 4 D M V        |
| 5                  | 5 E N W        |
| 6                  | 6 F O X        |
| 7                  | 7 G P Y        |
| 8                  | 8 H Q          |
| 9                  | 9 I R Z        |

Do you see what is it for? 

. 

. 

SPOILER

. 

. 



Yes -- the machine can also sort by letters, not just by digits. The only downside is that each letter will need two runs of the machine. In the first run, A, J, S end up in the same bucket. In the second run, just three buckets are enough. 

## Radix tree 
A [radix tree](https://en.wikipedia.org/wiki/Radix_tree) (or [Trie](https://en.wikipedia.org/wiki/Trie) or Patricia trie) is a data structure that is in many way analogous to radix sort. Instead of storing numbers by comparing them, we partition them into chunks and adress our memory by those chunks. See Wikipedia for how that works. As in radix sort, the algorithms will be explained for a small alphabet -- like 16 lower-case English letters -- but the interesting alphabet is often much larger. For example, an IPv4 address is a sequence of four 8-bit numbers, so choosing the base as 2^8, we may store IP adresses very efficiently in such a way that lookups require just four hops through our radix tree. This is much faster than storing them using the standard binary search tree. 


By the way, if we only wanted to store a bunch of IP adresses, we could as well use a simple hash table and not worry about radix trees at all. But the [routing tables](https://en.wikipedia.org/wiki/Routing_table) in routers need to store more complicated information -- they don't store just concrete addresses, but also _masks_ that represent an interval of IP addresses. For each mask, the routing table stores an information about where to route an incoming IP address that satisfies this mask. Hence, a hash table is not enough here, we really need a data structure that implements the _predecessor_ operation. 


## Radix sort complexity and the Word‑RAM model

What's the time complexity of radix sort? That's a harder question that it looks like. In classical comparison sorts, computing the time complexity ends up being about counting how many comparisons the algorithm does. For radix sort, we also need to take the bit representation into account. 

The standard model in which we analyze algorithms is called [Word‑RAM](https://en.wikipedia.org/wiki/Word_RAM). It's one of those models that are 1) incredibly important, because technically, most algorithms are analyzed in that model and 2) it's really hard to find a definition of it and, in fact, there are several sligthly different definitions. 

But in essence, Word-RAM is basically the C language, with the exception that instead of using 32-bit or 64-bit numbers, we just say that there's a parameter $w$ -- word size -- such that $w \ge \log n$. We need $w$ to be at least $\log n$ so that our words are large enough to store pointers to the input data. But potentially, $w$ could be larger, it is after all just a parameter. 

In this model, we assume that one basic operation with two words (summing them up, multiplying them) takes constant time $O(1)$. On the other hand, iterating over the bits in a word takes non-constant time $O(w)$. 

Let's compute the complexity of radix sort in this model. For integer keys, a radix pass (= 1 bucketsort) with base $B$ costs `O(n + B)`. To cover `w` bits, we need `w / log₂B` passes, giving the overall time complexity

$$
O\Big((n+B)\cdot\frac{w}{\log_2 B}\Big).
$$

The right (theoretical) way to choose $B$ is $B\approx n$. This is sensible -- we want the number of buckets to be as large as possible. At the same time, we want the handling of the buckets to be negligible when compared to iterating over the input $n$ numbers. This is also why in the video, we chose $B = 2^{16}$. 

Plugging in $B = n$, we get this complexity: 

$$
T(n,w)=O\!\left(n\cdot\frac{w}{\log n}\right).
$$

Notice that this isn’t linear time complexity. It is a function that depends on both $n$ and $w$. Yet, in many practical scenarios (like the scenario in our video), it is reasonable to think of $w$ as $w=O(\log n)$. In that setup, it is actually absolutely correct to claim that radix sort is a linear time algorithm! That may sound weird if you know about the $\Omega(n \log n)$ [sorting lower bound](https://en.wikipedia.org/wiki/Comparison_sort), but that lower bound only holds for sorting black-box objects, not integers in the Word-RAM model of computation. 

## Kirkpatrick–Reisch algorithm

There's a cool algorithm called [Kirkpatrick–Reisch sort](https://en.wikipedia.org/wiki/Kirkpatrick%E2%80%93Reisch_sort) with even better time complexity. Unfortunately, we ran it<footnote>On 128-bit integers iirc. </footnote> and it's just not very good in practice. But I like it because I think it's a great way to understand a data structure called [van Emde Boas tree](https://en.wikipedia.org/wiki/Van_Emde_Boas_tree) -- the algorithm is basically what would happen if you tried to use that tree for sorting.<footnote>In fact, I came up with it independently just by thinking about if we can say something about van emde Boas trees in a polylog video and figured that sorting numbers using that tree could be simpler. </footnote>

There's a nice explanation of the algorithm on [this great blog](https://sortingsearching.com/2020/06/06/kirkpatrick-reisch.html). The time complexity of the algorithm is $O(n \log \frac{w}{\log n})$.

## Sorting is an open problem!

This is a fine point that did not make it to the video. Although sorting is one of the simplest, and most basic open problems, we still dont't know **whether a linear-time algorithm in the Word-RAM model exists**. 

The fastest known theoretical algorithms are a bit better than Kirkpatrick–Reisch, but not by much. The complexity of that algorithm is extremely close to being linear, but it's not $O(n)$. Whether a truly linear-time algorithm exists, for all values of $w$, is an open problem. 

I think it's shocking that even for such a basic problem, and after decades of research, we still don't know what's going on!


## Random notes

- We messed up and when describing a card "storing spare parts for a car company", we showed just a random card. Here's the actual one:
![Example of a punched card with data fields](/assets/images/polylog/punched-card-example.webp)
- Our implementation of radix sort is also known as [American flag sort](https://en.wikipedia.org/wiki/American_flag_sort)
- We said that radix sort does not work on strings. The whole story is a bit more complicated -- if you want to order many short strings (think: surnames), radix sort is still very fast (see the discussion about time complexity and the IBM machine above). But in general, if you have many strings with potentially wildly different lengths, radix sort is slow. 

