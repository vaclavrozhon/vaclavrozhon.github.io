---
layout: single
title: "Who cares about STEM?"
date: 2025-10-19 22:00:00 +0100
categories: blog polylog data-analysis
tags: [polylog-meta, data-viz]
---

{% include footnotes.html %}

I want to analyze what I think is a pretty cool dataset: which countries are the Polylog viewers from. I will assume that this correlates with "how much people care about STEM in each country"<footnote>Sure, our channel is not representative of STEM, but hopefully the inherent biases do not make the overall data unrepresentative.</footnote>.

If that's true, we can use our data to find out which countries are especially STEM-friendly. Let's do it.


## Data

Here's the data points I want to analyze. The x axis is the population of a country, the y axis is number of views Polylog channel got from there. You can zoom in by clicking and move by dragging.

<div id="country-scatter-youtube"></div>

## A quick crosscheck

Are these data saying something about STEM, or just about YouTube adoption? Fortunately, there's a quick test we can do. With Tom Gavenčiak, we wrote a page [Bayes, bits, brains](https://bayesbitsbrains.github.io/) about theory behind ML, and I am tracking visits.<footnote>Sorry for that! But aren't these graphs making it worth?</footnote> We can correlate the two:

<div id="country-scatter-correlation"></div>

I plotted only countries with >10 hits. If all countries had the same ratio between the two numbers, they would lie on the red Baseline. There are a few outliers<footnote>China seems to censor YouTube even more than the rest of the Internet and Czechia has additive bias that's more pronounced for the smaller website than larger channel.</footnote> but otherwise I'd say it's a pretty good correlation. I will thus consider the YouTube data as reasonable and move on.

## What are we even looking for?

Looking at previous graphs, the main story is not very surprising. More views per capita come from richer countries with larger Internet adoption. What else is new?

That's why I will consider two baselines that I will measure our data against. The first one is [GDP per capita (PPP)](https://en.wikipedia.org/wiki/List_of_countries_by_GDP_(PPP)_per_capita). If a country watches more STEM videos than its neighbors with comparable GDP, surely there's some romance with STEM going on there.

The second benchmark is [the number of hits to any Wikipedia page per capita](https://stats.wikimedia.org/#/all-projects/reading/page-views-by-country/). This estimates the Internet activity in a given country.

Here's your last chance to have a guess at how each plot is going to look like and/or who the main outliers are going to be.

Now let's see what we got!

## GDP x YouTube

I didn't know what to expect there. Was the graph going to look like a straight line on log-log plot? (views = salary^C) I actually predicted that the plot should be quite "flat" -- if views = salary^C, I would guess C<1. But if this fit even makes sense for the plot below, then it seems C should in fact be larger than 1.

My intuition stemmed from my experience with Czechia and other Eastern Europe countries. Even if the salaries are substantially smaller than in the West, I don't think the cultural gap is that big. That in fact seems to be true if you zoom in to the top end of the plot. However, it seems to be a Europe thing that does not generalize to the overall picture.

<div id="country-scatter-gdp-youtube"></div>

### STEM-lovers
From this picture, I would somewhat arbitrarily classify these as the most STEM-loving: Nepal, Kenya, Morocco, India, Philippines, South Africa, Ukraine, Serbia, Latvia, Estonia, Hungary, Israel, New Zealand, Canada, Finland, Sweden, Australia, Netherlands, Denmark.


## Wikipedia x YouTube

This plot has less variance than the previous one, but still more than our crosscheck plot with the Bayes, bits, brains website. Hopefully, we are still measuring something of use.

<div id="country-scatter-per-capita"></div>

### STEM-lovers
Kenya, Nepal, India, South Africa, Philippines, Romania, Portugal, Hungary, Slovenia, Israel, New Zealand, Australia, Denmark, Norway, Switzerland, Sweden, Netherlands.

## Countries in both lists

The first-world winners seem to be Kenya, Nepal, and Philippines. But remember, our results will favor English-speaking countries, so we should correct for that. I think this mostly explains Kenya and Philippines. Nepal is weirdly off, but it's a small country with only 7000 views, so I preliminarily discard it as a fluke.

BRICS winners are India & South Africa. Again, it seems that English is playing a role.

In the first-world countries, I see a lot of English-speaking ones, as well as northern Europe + Swiss, known for their great English.

My main takeaway is thus mostly that 1) I don't see anything shocking in this dataset and 2) speaking English is a big deal.

Except for this one more thing.

## And the true winner is ...

... Eastern Europe. Nobody can accuse us of being good in English!





<script type="module" src="/widgets/dist/country-scatter.js"></script>
