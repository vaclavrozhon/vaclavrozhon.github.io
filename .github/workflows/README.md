# GitHub Actions Workflows

## Jekyll Deployment with Widgets

**File**: `jekyll.yml`

This workflow automatically builds React widgets and deploys the Jekyll site to GitHub Pages.

### Workflow Steps

1. **Checkout code**
2. **Setup Node.js** - Install Node 20 and cache npm dependencies
3. **Install widget dependencies** - Run `npm ci` in widgets/
4. **Build widgets** - Run `npm run build` to create dist/ bundles
5. **Setup Ruby** - Install Ruby 3.2 and bundle dependencies
6. **Setup Pages** - Configure GitHub Pages deployment
7. **Build Jekyll** - Build site with widgets/dist/ included
8. **Upload artifact** - Package built site
9. **Deploy to Pages** - Deploy to GitHub Pages environment

### Triggers

- Automatically on push to `main` branch
- Manually via Actions tab (workflow_dispatch)

### Requirements

To use this workflow, ensure:

1. **GitHub Pages is enabled** in repository settings
2. **GitHub Actions permissions** are set correctly:
   - Settings → Actions → General → Workflow permissions → Read and write
3. **Pages source** is set to "GitHub Actions":
   - Settings → Pages → Source → GitHub Actions

### Customization

Edit `jekyll.yml` to:
- Change Node/Ruby versions
- Add additional build steps
- Modify deployment settings
- Add environment variables

See main [README.md](../../README.md) for full documentation.
