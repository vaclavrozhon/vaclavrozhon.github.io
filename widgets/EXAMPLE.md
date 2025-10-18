# Example Blog Post with Embedded Components

This shows how you would use the analytics components in an actual blog post.

Create a file like `_posts/2025-10-18-my-analytics.md`:

```markdown
---
layout: single
title: "Website Analytics Visualization"
date: 2025-10-18
categories: analytics
---

## Population vs Unique Visits

Let's look at how unique visits correlate with country population:

<div id="population-chart-root"></div>
<script type="module" src="/widgets/dist/population-chart.js"></script>

The chart above shows a log-log scatter plot. Countries with larger populations
generally receive more unique visits, but there are interesting outliers!

## YouTube Geography Analysis

Now let's examine YouTube viewership patterns across different countries:

<div id="geography-charts-root"></div>
<script type="module" src="/widgets/dist/geography-charts.js"></script>

### Key Insights

- The first chart compares YouTube views to population
- The second chart shows site uniques vs population
- The third chart reveals relative engagement rates

## Styling Tips

You can add custom styling to the container divs:

<div id="population-chart-root" style="
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
  background: rgba(0,0,0,0.02);
  border-radius: 8px;
"></div>
<script type="module" src="/widgets/dist/population-chart.js"></script>

## Multiple Instances

You can even embed the same component multiple times with different configurations
(though you'll need to enhance the components to accept config via data attributes):

<div id="population-chart-root" data-config='{"height": 400}'></div>
<script type="module" src="/widgets/dist/population-chart.js"></script>
```

## Result

When Jekyll builds this post, it will:
1. Keep the `<div>` and `<script>` tags as-is
2. The browser loads the React component bundle
3. The component auto-mounts to the specified div
4. The visualization appears inline in your blog post!
