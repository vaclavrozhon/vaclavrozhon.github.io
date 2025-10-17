# Site Features and Conventions

## Custom Footnotes

This Jekyll site has custom footnote functionality that displays hover tooltips instead of traditional footnotes at the bottom of the page.

### Usage

**Include the footnotes script:**
Add this at the top of your markdown file (after the front matter):
```liquid
{% include footnotes.html %}
```

**Use the `<footnote>` tag:**
```html
Some text<footnote>This is the footnote content that appears in the tooltip.</footnote>
```

**Features:**
- Auto-numbered footnotes (1, 2, 3...)
- Hover tooltips that appear above the reference (below on mobile)
- Can include HTML in footnote content (e.g., `<a href="...">links</a>`)
- Mathematical notation works with `$$...$$` inside footnotes
- Mobile-friendly with responsive positioning

**Example:**
```markdown
Here's a cool fact about functions that has applications in graph theory.<footnote>First proven <a href="https://example.com">here</a>.</footnote>

The plane $$\mathbb{R}^2$$ has this property.<footnote>The question actually asks about a different space than $$\mathbb{R}^2$$.</footnote>
```

**Location:**
- Implementation: `_includes/footnotes.html`
- Example usage: `polylog/radixsort.md`, `blog/AI_examples.md`

## Jekyll Configuration

- Theme: `mmistakes/minimal-mistakes@4.26.2`
- Math rendering: KaTeX (enable with `katex: true` in front matter)
- Use `$$...$$` for inline and display math (not single `$`)

## Excluded Directories

Some directories with node_modules are excluded from Jekyll builds to avoid Liquid syntax errors:
- `teaching/pagerank/node_modules/`
- `teaching/metropolis-demo/`
- `teaching/landscape-demo/node_modules/`
