# The Golden Ratio CLI

An MCP server plugin for Claude Code that validates website designs against golden ratio (φ ≈ 1.618) principles. Point it at any running website and get a proportional audit of your layout, typography, spacing, and element dimensions.

## Install

### Claude Code (recommended)

Two commands inside Claude Code:

```
/plugin marketplace add RAG-CONSULTING/the-golden-ratio-CLI
/plugin install golden-ratio-cli
```

That's it. Dependencies and Chromium are installed automatically on first run.

### Manual

If you prefer to configure the MCP server directly, add to your `.claude/mcp.json` (global) or project `.mcp.json`:

```json
{
  "mcpServers": {
    "golden-ratio": {
      "command": "npx",
      "args": ["golden-ratio-cli"]
    }
  }
}
```

## Tools

### `analyze_layout`

Full page layout audit. Detects column arrangements, section height ratios, and major element proportions.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | *required* | URL to analyze (e.g. `http://localhost:3000`) |
| `viewport_width` | number | 1440 | Viewport width in pixels |
| `viewport_height` | number | 900 | Viewport height in pixels |
| `tolerance` | number | 0.10 | Acceptable deviation from φ (0.10 = 10%) |

### `analyze_typography`

Checks font size ratios between heading levels (h1-h6), body text, and line-height proportions.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | *required* | URL to analyze |
| `selector` | string | `"body"` | CSS selector to scope the analysis |
| `tolerance` | number | 0.10 | Acceptable deviation from φ |
| `viewport_width` | number | 1440 | Viewport width in pixels |
| `viewport_height` | number | 900 | Viewport height in pixels |

### `analyze_spacing`

Audits margin and padding relationships for golden ratio harmony between related elements.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | *required* | URL to analyze |
| `selector` | string | `"body"` | CSS selector to scope the analysis |
| `tolerance` | number | 0.10 | Acceptable deviation from φ |
| `viewport_width` | number | 1440 | Viewport width in pixels |
| `viewport_height` | number | 900 | Viewport height in pixels |

### `analyze_element`

Checks a specific element's width/height ratio, padding proportions, and relationship to its parent container.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | *required* | URL to analyze |
| `selector` | string | *required* | CSS selector (e.g. `.hero-card`, `#main-modal`) |
| `include_children` | boolean | false | Also analyze direct children's proportions |
| `tolerance` | number | 0.10 | Acceptable deviation from φ |
| `viewport_width` | number | 1440 | Viewport width in pixels |
| `viewport_height` | number | 900 | Viewport height in pixels |

### `generate_report`

Runs all analyses by scrolling through the entire page section-by-section. Each viewport-height frame is analyzed independently, with the first frame reported as the **"First Contact"** — the above-the-fold view users see on initial page load.

The report includes:
- A full-page annotated screenshot with golden ratio overlays
- Per-section annotated screenshots, each with its own grade
- A "First Contact" score highlighting the initial viewport impression
- Merged overall scores across all sections

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | *required* | URL to analyze |
| `viewport_width` | number | 1440 | Viewport width in pixels |
| `viewport_height` | number | 900 | Viewport height in pixels |
| `tolerance` | number | 0.10 | Acceptable deviation from φ |
| `format` | `"detailed"` \| `"summary"` | `"detailed"` | Summary shows only scores and top issues |

#### Section-by-section analysis

The report divides the page into viewport-height sections and scores each one:

```
First Contact (viewport):  A   (score: 92)
  layout:     95  — hero 61.8% / sidebar 38.2% ✓
  typography: 88  — h1/h2 ratio 1.55
  spacing:    90

Section 2 (scroll 1):      B+  (score: 84)
Section 3 (scroll 2):      B   (score: 80)
Footer zone:                C+  (score: 72)

Overall:                    B+  (score: 82)
```

This matters because the golden ratio relationships users perceive on first load carry more weight for first impressions than content further down the page. The individual tool analyzers (`analyze_layout`, `analyze_typography`, `analyze_spacing`) still operate on the full page for targeted audits.

## What It Measures

Each tool returns JSON with measurements containing:

- **`actual_ratio`** — the measured ratio between two values
- **`target_ratio`** — 1.618 (φ)
- **`deviation_pct`** — how far off from golden ratio (%)
- **`pass`** — whether it's within tolerance
- **`suggestion`** — actionable CSS fix (e.g. *"Adjust to ~370px (600px / 1.618) for golden ratio"*)

### Scoring

Measurements are scored 0-100 per category, then weighted into an overall grade:

| Category | Weight |
|----------|--------|
| Layout | 35% |
| Typography | 25% |
| Spacing | 25% |
| Element | 15% |

| Grade | Score |
|-------|-------|
| A | 90-100 |
| B | 80-89 |
| C | 70-79 |
| D | 60-69 |
| F | < 60 |

## Example Usage

In Claude Code, with your dev server running:

> "Run a golden ratio report on http://localhost:3000"

> "Check if my hero card at .hero-section follows golden ratio proportions"

> "Analyze the typography scale on my landing page"

## The Golden Ratio in Web Design

The golden ratio (φ ≈ 1.618) appears throughout nature and has been used in art and architecture for centuries. In web design, it provides a framework for proportional harmony:

- **Layout**: A 1000px container splits into 618px content + 382px sidebar
- **Typography**: A base font of 16px scales to 26px, 42px, 68px for headings
- **Spacing**: If inner padding is 20px, outer margin would be ~32px
- **Elements**: A card at 300px wide would be ~185px tall

Not every measurement needs to hit φ exactly — the 10% default tolerance accounts for practical rounding and browser rendering. The goal is proportional harmony, not mathematical perfection.

## Development

```bash
git clone <repo-url>
cd the-golden-ratio-CLI
npm install          # also installs Chromium via postinstall
npm run build        # compile TypeScript
npm test             # run unit + integration tests
```

## License

MIT
