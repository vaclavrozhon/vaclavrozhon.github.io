---
layout: single
title: Polylog gender studies
date: 2025-10-17 10:00:00 +0100
categories: blog polylog youtube
katex: true
header:
  teaser: /assets/images/thumbs/polylog_gender_thumb.png
---

{% include footnotes.html %}

Polylog is a mid-sized algorithms channel. Riddle: What share of viewers is male vs female? Make a guess before you go on.

<div id="gender-guess-root" data-answer="97.5"></div>
<script type="module" src="/widgets/dist/gender-guess.js"></script>

<div id="revealed-content" style="filter: blur(8px); pointer-events: none; user-select: none; transition: filter 0.5s ease;" markdown="1">

Yeah. When I started working on Polylog, I had high hopes about videos being a nice way of democratizing computer science (CS) education. This could mean accessibility to people from third-world countries. But also to women: In my experience, many students first encounter math or computer science at math competitions, but these are tailored to boys. "Beat others at math" simply isn't the best motivation for everybody. Maybe videos can do much better! 

It seems that I have been mistaken, at least in the gender aspect. 

This post is not about finding mistakes in our work or lamenting on the state of the world. Self-reflection is in order, but first, I would like to understand where this huge discrepancy comes from. Can we break it down into several understandable factors?

Here's the best answer I got. First things first: I’ll take YouTube’s gender field of 2.5% female at face value as a correct number.<footnote>Is it clear this number is correct? It is possible that women are more likely not to disclose or may misreport their gender. It is also possible that YouTube's algorithm tries to infer the gender of users who don't disclose it and does a poor job. And because the share of women viewers is so low (and the share of trans people in tech relatively high), the share of nonbinary/trans viewers could change the interpretation of the number substantially. I do not consider any of this here.</footnote>

Before we start, 97.5% corresponds to odds of 39:1. It turns out that $\log_2(39)$ is about $5.3$, so I think of our task as explaining around $5$ bits of discrepancy with respect to the $1:1$ baseline in the population.


## Biased baseline

Gender bias in computer science is hard to miss. Let's try to estimate some baseline about the share of women in computer science and STEM in high-income countries. A few data points:

- in 2022, the share of women STEM researchers has been around 30% in the US and 40% worldwide.<footnote><a href="https://www.insidehighered.com/news/diversity/sex-gender/2024/06/11/women-make-global-gains-researchers-gaps-persist#:~:text=%E2%80%9CWe%20still%20have%20these%20perceptions,a%20quarter%20of%20mathematics%20researchers">Source</a></footnote>.
- in 2018, around 20% of AI researchers were women.<footnote><a href="https://www.insidehighered.com/news/diversity/sex-gender/2024/06/11/women-make-global-gains-researchers-gaps-persist#:~:text=%E2%80%9CWe%20still%20have%20these%20perceptions,a%20quarter%20of%20mathematics%20researchers">Source</a></footnote>
- in the late 2010s, around 20% of CS undergrads/PhD students/CS faculty were female.<footnote><a href="https://womenshistorymonth.cc.gatech.edu/changing-the-landscape/#:~:text=Nationally%2C%2018%20percent%20of%20undergraduate,students%20are%20female">Source</a></footnote>

I take it that the baseline ratio is ~80% male among CS-interested people. That’s ~4:1, i.e., ≈2 bits already found in the 5.3-bit budget.
 



## YouTube-general bias

It may be that men consume YouTube (or the Internet in general) more than women. I found this:

- Women are slightly more likely to visit YouTube; however, male visitors spend longer per day (men: 54 minutes, women: 40 minutes).<footnote><a href="https://www.ofcom.org.uk/siteassets/resources/documents/research-and-data/online-research/online-nation/2024/online-nation-2024-report.pdf?v=386238">Source</a></footnote>

- 54% of YouTube’s audience is male and 46% female in 2025.<footnote><a href="https://datareportal.com/essential-youtube-stats">DataReportal</a>, <a href="https://www.globalmediainsight.com/blog/youtube-users-statistics/#:~:text=Considering%20user%20gender%2C%20YouTube%20is,popular%20among%20men%20than%20women">Global Media Insight</a></footnote> But only 49% were male in the US in 2023.<footnote><a href="https://blog.hubspot.com/marketing/youtube-demographics#:~:text=,34.%20%28Statista">HubSpot/Statista</a></footnote>

I take it that this can explain a small part of our problem, but only a small part. 


## Women in STEM procrastinate differently from men

Imagine the pool of STEM-loving people, split 80-20 in favor of men. Now highlight the fraction $p_{men}$ of men that watch YouTube STEM videos and the analogous $p_{women}$ fraction of women. What's the relation between $p_{men}$ and $p_{women}$?

<div id="stem-pool-root"></div>
<script type="module" src="/widgets/dist/stem-pool.js"></script>

I think $p_{women} \ll p_{men}$. Here are two theories why. 

First, even if men versus women spend comparable time on YouTube in general, maybe it's not true for men in STEM versus women in STEM. Thinking of my women friends in STEM, I even entertain the hypothesis that they are more likely to have other hobbies, social lives, and kids. Or perhaps the fact that most large STEM YouTubers are male plays a role for reasons that could be both benign and outright sexist (more on this effect in the next section).

The second hypothesis is the algorithm. This is of course incredibly important for what kind of people get offered your video. Unfortunately, this is extremely opaque and hard to reason about. But we can reason about incentives. Imagine the following simple toy model. 

Imagine a simple game where you keep flipping a biased coin that lands heads 80% of the time. Before each flip, you can predict the outcome and get a dollar if you predict correctly. To win the most money, the right strategy is to predict heads _every_ time, not 80% of the time. 

Similarly, imagine that you know that most women like videos about cooking, beauty, or animals, while most men like videos about cars, soccer, or computers. With what probability should you suggest a cooking video to a male viewer? Unless there are some other constraints (like the viewer wanting some diversity, etc.), the probability is zero; you should stay with cars and sports.

The fraction $p_{men} / p_{women}$ could in theory be estimated by pooling the data from a few large channels like Veritasium or 3blue1brown and estimating from them. But I could not find data for these large channels. My guess would be that their viewership would be about 85-95% male. 

Another way of estimating this number is to look at the fraction of female/male science hosts and estimate that the fraction of viewers is roughly the same. I found an estimate that 8% of STEM hosts are female.<footnote>[source](https://pubmed.ncbi.nlm.nih.gov/29974815/#:~:text=video%20content,per%20view%2C%20and%20significantly%20higher)</footnote> This would lead to about $p_{men} / p_{women} \approx 3.1$.

I.e., I think $p_{men} / p_{women}$ is between $2$ and $4$ and some combination of the two theories thus explains one to two more bits in the $5.3$-bit mystery.


## Birds of a feather

Here's the male/female ratio for some other YouTube channels, where I could find it, to get some sense of what's going on. <footnote>Sources: <a href="https://www.parrotanalytics.com/insights/amazons-mrbeast-series-is-primed-for-success/#:~:text=Specifically%20the%20demographics%20of%20MrBeast%E2%80%99s,be%20a%20challenge%20but%20also">MrBeast</a>, <a href="https://www.frontiersin.org/journals/communication/articles/10.3389/fcomm.2021.610920/full">It's Okay to Be Smart, Physics Girl, and Hydraulic Press</a>, <a href="https://www.edisonresearch.com/who-joe-rogan-listeners-are-likely-to-support-in-the-election/#:~:text=Known%20for%20its%20influence%20and,align%20with%20Democrats">Joe Rogan</a>, <a href="https://www.mediamonitors.com/audience-demographic-variations-specific-to-genre/?utm_source=chatgpt.com">Crime Junkie</a>. Generally, the sources were found by GPT and I did not cross-check them.
</footnote>

<div id="gender-table-root" data-channels='[
  {"name":"Crime Junkie","host":"Female","topic":"True Crime","malePercent":15},
  {"name":"MrBeast","host":"Male","topic":"Entertainment","malePercent":74},
  {"name":"Its Okay to Be Smart","host":"Male","topic":"Science","malePercent":75},
  {"name":"Physics Girl","host":"Female","topic":"Science","malePercent":80},
  {"name":"Joe Rogan","host":"Male","topic":"Podcast","malePercent":80},
  {"name":"Hydraulic Press","host":"Balanced","topic":"Engineering","malePercent":94}
]'></div>
<script type="module" src="/widgets/dist/gender-table.js"></script>


Here's where I believe we may find one last bit. If you look at the table above, you can see that viewership tends to follow host gender. MrBeast does game shows, which sounds like a gender‑neutral theme, but viewership skews 2:1 male. Joe Rogan does podcasts, which again sounds like a gender‑neutral category, yet they seem to cater more successfully to men than women.

On the other hand, Physics Girl has a phenomenal 20% women viewers, while our channel has 2.5%—clearly she's doing something different! Also, a woman‑hosted podcast about crime has only 15% male audience, while the general split for this type of content is more balanced, 1:2 male to female.<footnote>[source](https://www.pewresearch.org/short-reads/2023/06/20/true-crime-podcasts-are-popular-in-the-us-particularly-among-women-and-those-with-less-formal-education/?utm_source=chatgpt.com)</footnote>

I don't want to analyze each creator and try to guess the unique factor that makes them more or less friendly to men or women. Something like this simply keeps happening<footnote>And not just for YouTube. I've heard about this also in the context of classroom teaching and found, e.g., this <a href="https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0239766">paper</a>.</footnote> and can be pretty strong because the fraction of women is already slim: for example, imagine a world with 10 STEM viewers and 10 STEM content creators. In both cases there are 9 males and one female. Now imagine that everybody prefers content of their gender. Perhaps our female viewer prefers it greatly and watches male‑created and female‑created content 50% of the time. On the other hand, each male is watching the female creator only about 5% instead of 10%.

In this model, each creator gets the same rate of views, but the male creators get only approximately 5% female views, not 10%!

<div id="viewer-creator-root"></div>
<script type="module" src="/widgets/dist/viewer-creator.js"></script>

That is, the fact that there are few female content creators is not just pushing women out of the field, but also changing the ratio of male creators. Looking at the other channels in the table, I think that 0.5–1 bit could easily be found here, but it's hard to say.

## Putting it together

My current guess is something like this:

<div id="bias-breakdown-root-1" data-segments='[
  {"label":"STEM baseline","value":2,"description":"20% of CS researchers/students are women"},
  {"label":"YouTube general","value":0.3,"description":"Men spend slightly more time on YouTube"},
  {"label":"p_men / p_women","value":2,"description":"Women in STEM watch less YouTube STEM content"},
  {"label":"Birds of a feather","value":1,"description":"Same-gender preference amplifies imbalance"}
]' data-total="5.3"></div>
<script type="module" src="/widgets/dist/bias-breakdown.js"></script>

Or maybe something like this?

<div id="bias-breakdown-root-2" data-segments='[
  {"label":"STEM baseline","value":2,"description":"20% of CS researchers/students are women"},
  {"label":"YouTube general","value":0.3,"description":"Small general gender difference"},
  {"label":"p_men / p_women","value":1.5,"description":"Women in STEM watch less YouTube STEM content"},
  {"label":"Birds of a feather","value":0.5,"description":"Same-gender preference"},
  {"label":"Unique misogyny","value":1,"description":"Channel-specific gender bias"}
]' data-total="5.3"></div>
<script type="module" src="/widgets/dist/bias-breakdown.js"></script>

Maybe there is something uniquely misogynistic and sexist about our channel and/or our topics?<footnote>I mean beyond baseline misogyny that's already counted in "birds of a feather" argument. </footnote> Hard to say, but I still find it helpful to see how the crazy proportions can arise from a few boring mechanisms amplifying an existing bias. <footnote>I found <a href="https://hci.ucsd.edu/papers/millions_views.pdf#:~:text=For%20example%2C%20C27%2C%20a%20female,male%E2%80%9D">a paper</a> that discusses similar issue and cites some other content creators opinions on it -- I think mostly similar arguments, but also some that I did not mention. </footnote>

</div>

<script>
  // Listen for the widget submission event
  window.addEventListener('genderGuessSubmitted', function(event) {
    const revealedContent = document.getElementById('revealed-content');
    if (revealedContent) {
      revealedContent.style.filter = 'blur(0px)';
      revealedContent.style.pointerEvents = 'auto';
      revealedContent.style.userSelect = 'auto';
    }
  });
</script>
