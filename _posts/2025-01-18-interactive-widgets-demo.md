---
layout: single
title: "Interactive Widgets Demo"
date: 2025-01-18 10:00:00 +0100
categories: demo interactive
---

This post demonstrates how to embed interactive React widgets into Jekyll blog posts. The widgets are built separately and loaded as standalone JavaScript modules.

## Counter Widget

Here's a simple interactive counter that demonstrates React state management:

<div id="counter-widget-root" data-initial="0" data-step="1"></div>
<script type="module" src="/widgets/dist/counter-widget.js"></script>

You can configure the counter using data attributes. For example, here's one that starts at 10 and increments by 5:

<div id="counter-widget-root-2" data-initial="10" data-step="5"></div>
<script type="module">
  import { createRoot } from 'https://esm.sh/react-dom@18/client';
  import React from 'https://esm.sh/react@18';

  // This would ideally import the Counter component directly, but for now
  // we'll keep it simple with separate root IDs
  const el = document.getElementById('counter-widget-root-2');
  if (el) {
    // Counter component auto-mounts, so we just need the div
  }
</script>

Note: Multiple instances currently need the component to be enhanced to support multiple root elements.

## Following Eyes Widget

Move your cursor around and watch the eyes follow:

<div id="following-eyes-widget-root"></div>
<script type="module" src="/widgets/dist/following-eyes-widget.js"></script>

This widget demonstrates:
- Real-time event handling (mousemove)
- Smooth animations with CSS transitions
- Calculating positions and angles in React

## How It Works

Each widget is:
1. Built as an independent React component
2. Compiled to a standalone JavaScript bundle using Vite
3. Auto-mounted when the script loads (looks for specific div IDs)
4. Configurable via data attributes

This approach allows us to mix static Jekyll content with dynamic React components seamlessly!

## Technical Details

The build process uses Vite with multiple entry points. Each widget:
- Lives in `widgets/src/widgets/WidgetName/`
- Has its own `index.jsx` entry point
- Gets built to `dist/widget-name.js`
- Can be embedded with just a div + script tag

Perfect for adding interactivity to static blog posts without a full SPA!
