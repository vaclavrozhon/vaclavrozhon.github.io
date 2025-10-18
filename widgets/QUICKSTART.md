# Quick Start Guide

## Initial Setup

```bash
cd widgets
npm install
```

## Preview Components (Development)

**Recommended for development:**

```bash
npm run dev
```

- Opens `preview.html` automatically
- Hot-reloads on code changes
- Shows all components in one page
- Perfect for rapid iteration

## Preview Production Build

**Test exactly what will be deployed:**

```bash
npm run build
npm run preview
```

Then visit http://localhost:4173/preview-dist.html

Or use the `serve` package:
```bash
npm run build
npm run serve
```

Then visit http://localhost:8080/preview-dist.html

## Build for Deployment

```bash
npm run build
```

This creates:
- `dist/population-chart.js`
- `dist/geography-charts.js`
- `dist/assets/*`

Commit these files:
```bash
git add dist/
git commit -m "Build analytics components"
```

## Clean Build Artifacts

```bash
npm run clean
```

## Preview Files Explained

- **`preview.html`** - Development preview (loads from `src/`)
  - Use with `npm run dev`
  - Hot-reload enabled

- **`preview-dist.html`** - Production preview (loads from `dist/`)
  - Use with `npm run preview` or `npm run serve`
  - Tests the actual built files

## Workflow Summary

### Daily Development
1. `npm run dev` - work on components
2. Edit files in `src/components/`
3. See changes instantly in browser

### Before Committing
1. `npm run build` - create production bundles
2. `npm run preview` - verify built output works
3. `git add dist/` - commit the built files
4. Components are now ready to embed in blog posts!
