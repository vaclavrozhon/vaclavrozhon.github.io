# Available Widgets & Components

This document lists all embeddable widgets and components available in the analytics package.

## 📊 Data Visualization Widgets

### Population Chart
**File:** `src/widgets/PopulationChart/`
**Bundle:** `dist/population-chart.js`
**Root ID:** `population-chart-root`

Log-log scatter plot comparing country population to unique website visits.

```html
<div id="population-chart-root"></div>
<script type="module" src="/widgets/dist/population-chart.js"></script>
```

### Geography Charts
**File:** `src/widgets/GeographyCharts/`
**Bundle:** `dist/geography-charts.js`
**Root ID:** `geography-charts-root`

Multiple visualizations showing YouTube views and site analytics across countries.

```html
<div id="geography-charts-root"></div>
<script type="module" src="/widgets/dist/geography-charts.js"></script>
```

## 🎮 Interactive Widgets

### Counter Widget
**File:** `src/widgets/Counter/`
**Bundle:** `dist/counter-widget.js`
**Root ID:** `counter-widget-root`

Simple interactive counter demonstrating React state management.

**Configuration:**
- `data-initial`: Starting value (default: 0)
- `data-step`: Increment/decrement amount (default: 1)

```html
<!-- Basic counter -->
<div id="counter-widget-root"></div>
<script type="module" src="/widgets/dist/counter-widget.js"></script>

<!-- Configured counter -->
<div id="counter-widget-root" data-initial="100" data-step="10"></div>
<script type="module" src="/widgets/dist/counter-widget.js"></script>
```

### Following Eyes Widget
**File:** `src/widgets/FollowingEyes/`
**Bundle:** `dist/following-eyes-widget.js`
**Root ID:** `following-eyes-widget-root`

Interactive eyes that follow the cursor around the screen.

```html
<div id="following-eyes-widget-root"></div>
<script type="module" src="/widgets/dist/following-eyes-widget.js"></script>
```

## 📁 Source Organization

```
src/
├── widgets/              # All embeddable widgets
│   ├── PopulationChart/
│   │   ├── PopulationChart.jsx
│   │   └── index.jsx
│   ├── GeographyCharts/
│   │   ├── GeographyCharts.jsx
│   │   └── index.jsx
│   ├── Counter/
│   │   ├── Counter.jsx
│   │   └── index.jsx
│   └── FollowingEyes/
│       ├── FollowingEyes.jsx
│       └── index.jsx
└── utils/                # Shared utilities
```

## 🔧 How It Works

Each widget:

1. **Lives independently** in its own folder under `src/widgets/`
2. **Has two files:**
   - `WidgetName.jsx` - The React component
   - `index.jsx` - Entry point that auto-mounts to DOM
3. **Auto-mounts** when script loads (searches for specific div ID)
4. **Can be configured** via data attributes
5. **Builds to a single JS file** in `dist/`

## ➕ Adding New Widgets

1. Create folder: `src/widgets/YourWidget/`
2. Create component: `YourWidget.jsx`
3. Create entry point: `index.jsx`
4. Add to `vite.config.js`:
   ```javascript
   'your-widget': resolve(__dirname, 'src/widgets/YourWidget/index.jsx')
   ```
5. Build: `npm run build`
6. Use: `<div id="your-widget-root"></div>`

All widgets follow the same pattern - whether they're data visualizations with D3.js or simple interactive React components.
