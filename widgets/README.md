# Analytics Components

This directory contains React-based analytics visualization components that can be embedded in Jekyll blog posts.

## Setup

1. Install dependencies:
```bash
cd widgets
npm install
```

2. Build components:
```bash
npm run build
```

This creates `dist/population-chart.js` and `dist/geography-charts.js` which can be embedded in blog posts.

## Development

### Live Preview (Recommended)

Run the development server to preview all components with hot-reload:
```bash
npm run dev
```

This will:
- Start Vite dev server on http://localhost:3000
- Automatically open `preview.html` in your browser
- Show all components in a single page
- Hot-reload on any code changes

### Production Preview

To test the built output:
```bash
npm run build
npm run preview
```

This serves the built `dist/` files exactly as they'll work in production.

## Embedding Components in Blog Posts

After building, you can embed components in any Jekyll blog post or page:

### Population Chart

```html
---
title: My Blog Post
---

Here's my analysis of population vs. unique visits:

<div id="population-chart-root"></div>
<script type="module" src="/widgets/dist/population-chart.js"></script>
```

### Geography Charts

```html
---
title: Geography Analysis
---

Multiple charts showing YouTube views and site analytics:

<div id="geography-charts-root"></div>
<script type="module" src="/widgets/dist/geography-charts.js"></script>
```

### Interactive Widgets

#### Counter Widget

```html
<!-- Basic counter -->
<div id="counter-widget-root"></div>
<script type="module" src="/widgets/dist/counter-widget.js"></script>

<!-- Configured counter (starts at 10, increments by 5) -->
<div id="counter-widget-root" data-initial="10" data-step="5"></div>
<script type="module" src="/widgets/dist/counter-widget.js"></script>
```

#### Following Eyes Widget

```html
<div id="following-eyes-widget-root"></div>
<script type="module" src="/widgets/dist/following-eyes-widget.js"></script>
```

## Adding New Widgets

1. Create a new widget directory in `src/widgets/YourWidget/`
2. Create `YourWidget.jsx` (the React component)
3. Create `index.jsx` (entry point that auto-mounts to DOM)
4. Add entry to `vite.config.js`:
   ```javascript
   input: {
     'your-widget': resolve(__dirname, 'src/widgets/YourWidget/index.jsx'),
   }
   ```
5. Build and use: `<div id="your-widget-root"></div>`

## File Structure

```
widgets/
├── src/                    # Source code (excluded from Jekyll)
│   ├── widgets/           # All embeddable widgets
│   │   ├── PopulationChart/
│   │   ├── GeographyCharts/
│   │   ├── Counter/
│   │   └── FollowingEyes/
│   └── utils/             # Shared utilities
├── public/                # Static assets (excluded from Jekyll)
│   └── *.json            # Data files
├── dist/                  # Built output (included in Jekyll)
│   ├── population-chart.js
│   ├── geography-charts.js
│   ├── counter-widget.js
│   ├── following-eyes-widget.js
│   └── assets/
├── preview.html           # Development preview
├── preview-dist.html      # Production preview
├── package.json
└── vite.config.js
```

### Directory Organization

- **`src/widgets/`** - All embeddable widgets (charts, interactive elements, etc.)
- **`src/utils/`** - Shared helper functions

Each widget is completely independent with its own folder containing all related code.

## Deployment

The `dist/` directory should be committed to git. GitHub Pages will serve these files along with the Jekyll site.

Build before committing:
```bash
npm run build
git add dist/
git commit -m "Update analytics components"
```
