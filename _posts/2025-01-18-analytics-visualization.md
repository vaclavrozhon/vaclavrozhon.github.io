---
layout: single
title: "Website Analytics Visualization"
date: 2025-01-18 11:00:00 +0100
categories: analytics data visualization
---

This post explores website analytics data through interactive visualizations built with React and D3.js.

## Population vs Unique Visits

The following chart shows the relationship between country population and unique website visits on a logarithmic scale:

<div id="population-chart-root"></div>
<script type="module" src="/widgets/dist/population-chart.js"></script>

### Key Observations

- **Log-log scale**: Both axes use logarithmic scaling, which helps visualize the wide range of values
- **Positive correlation**: Larger populations generally correlate with more unique visits
- **Outliers**: Some countries punch above or below their weight

## YouTube Geography Analytics

Let's dive deeper into YouTube viewership patterns across different countries:

<div id="geography-charts-root"></div>
<script type="module" src="/widgets/dist/geography-charts.js"></script>

### Analysis

This visualization includes three charts:
1. **YouTube views vs population**: Shows how viewership scales with country size
2. **Site uniques vs population**: Compares website traffic patterns
3. **Engagement rates**: Normalizes the metrics to reveal relative engagement

Countries with engagement rates above 1.0 are over-performing relative to their population share.

## Data Sources

- **Unique visits**: ClustrMaps snapshot data
- **Population**: Official UN estimates (2024-2025)
- **YouTube views**: YouTube Studio geography export

## Interactive Features

- **Hover tooltips**: See exact values for each country
- **Responsive design**: Charts adapt to your screen size
- **Logarithmic scales**: Handle the wide range of data values

These visualizations are built as standalone React components that can be easily embedded in any blog post!

---

Want to add similar interactive visualizations to your Jekyll blog? Check out the [setup guide](https://github.com/your-repo) for details on building embeddable React components.
