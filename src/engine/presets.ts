import type { PageType, PageContext, SpiralOrigin, CategoryWeights } from "./types.js";

const DEFAULT_TYPO_SELECTORS = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "small"];

const PRESETS: Record<PageType, PageContext> = {
  general: {
    pageType: "general",
    weights: { layout: 0.35, typography: 0.25, spacing: 0.25, element: 0.15 },
    tolerance: 0.10,
    typographySelectors: DEFAULT_TYPO_SELECTORS,
    spacingChildLimit: 30,
    spiralOrigin: "bottom-right",
    gradeThresholds: { A: 90, B: 80, C: 70, D: 60 },
  },
  landing: {
    pageType: "landing",
    weights: { layout: 0.40, typography: 0.30, spacing: 0.20, element: 0.10 },
    tolerance: 0.08,
    typographySelectors: [...DEFAULT_TYPO_SELECTORS, "[class*='hero']", "[class*='headline']"],
    spacingChildLimit: 30,
    spiralOrigin: "top-right",
    gradeThresholds: { A: 90, B: 80, C: 70, D: 60 },
  },
  saas: {
    pageType: "saas",
    weights: { layout: 0.30, typography: 0.20, spacing: 0.35, element: 0.15 },
    tolerance: 0.10,
    typographySelectors: [...DEFAULT_TYPO_SELECTORS, "label", ".label", "button", ".button"],
    spacingChildLimit: 50,
    spiralOrigin: "top-left",
    gradeThresholds: { A: 88, B: 78, C: 68, D: 58 },
  },
  portfolio: {
    pageType: "portfolio",
    weights: { layout: 0.25, typography: 0.45, spacing: 0.20, element: 0.10 },
    tolerance: 0.08,
    typographySelectors: [...DEFAULT_TYPO_SELECTORS, "blockquote", "figcaption", ".caption"],
    spacingChildLimit: 30,
    spiralOrigin: "top-left",
    gradeThresholds: { A: 92, B: 82, C: 72, D: 62 },
  },
  ecommerce: {
    pageType: "ecommerce",
    weights: { layout: 0.25, typography: 0.15, spacing: 0.40, element: 0.20 },
    tolerance: 0.12,
    typographySelectors: [...DEFAULT_TYPO_SELECTORS, ".price", "[class*='price']"],
    spacingChildLimit: 120,
    spiralOrigin: "top-left",
    gradeThresholds: { A: 88, B: 78, C: 68, D: 58 },
  },
  blog: {
    pageType: "blog",
    weights: { layout: 0.20, typography: 0.50, spacing: 0.20, element: 0.10 },
    tolerance: 0.08,
    typographySelectors: [...DEFAULT_TYPO_SELECTORS, "blockquote", "li", "figcaption"],
    spacingChildLimit: 40,
    spiralOrigin: "top-left",
    gradeThresholds: { A: 92, B: 82, C: 72, D: 62 },
  },
};

export function resolveContext(
  pageType?: PageType,
  overrides?: {
    weights?: Partial<CategoryWeights>;
    tolerance?: number;
    spiralOrigin?: SpiralOrigin;
  }
): PageContext {
  const base = PRESETS[pageType ?? "general"];
  const ctx = { ...base };
  if (overrides?.weights) {
    ctx.weights = { ...base.weights, ...overrides.weights };
  }
  if (overrides?.tolerance !== undefined) {
    ctx.tolerance = overrides.tolerance;
  }
  if (overrides?.spiralOrigin) {
    ctx.spiralOrigin = overrides.spiralOrigin;
  }
  return ctx;
}
