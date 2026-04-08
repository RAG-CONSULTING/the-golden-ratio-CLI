import type { Page } from "playwright";
import type { Measurement } from "./types.js";
import { createMeasurement } from "./ratio-calculator.js";

interface RawRect {
  selector: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RawTypography {
  selector: string;
  fontSize: number;
  lineHeight: number;
}

interface RawSpacing {
  selector: string;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
}

// --- Layout Extraction ---

export async function extractLayoutMeasurements(
  page: Page,
  tolerance: number
): Promise<Measurement[]> {
  const measurements: Measurement[] = [];

  // Get body direct children bounding rects
  const rects: RawRect[] = await page.evaluate(() => {
    const body = document.body;
    const children = Array.from(body.children) as HTMLElement[];
    return children
      .filter((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden";
      })
      .map((el, i) => {
        const rect = el.getBoundingClientRect();
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : "";
        const cls = el.className && typeof el.className === "string"
          ? `.${el.className.split(" ").filter(Boolean).join(".")}`
          : "";
        return {
          selector: `${tag}${id}${cls}` || `body > :nth-child(${i + 1})`,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        };
      })
      .filter((r) => r.width > 0 && r.height > 0);
  });

  // Detect side-by-side columns (elements sharing same y position)
  const yGroups = new Map<number, RawRect[]>();
  for (const rect of rects) {
    const roundedY = Math.round(rect.y / 5) * 5;
    const group = yGroups.get(roundedY) ?? [];
    group.push(rect);
    yGroups.set(roundedY, group);
  }

  for (const [, group] of yGroups) {
    if (group.length >= 2) {
      const sorted = group.sort((a, b) => b.width - a.width);
      for (let i = 0; i < sorted.length - 1; i++) {
        const wider = sorted[i];
        const narrower = sorted[i + 1];
        if (narrower.width > 50) {
          measurements.push(
            createMeasurement(
              `${wider.selector} / ${narrower.selector}`,
              "column width ratio",
              wider.width,
              narrower.width,
              tolerance
            )
          );
        }
      }
    }
  }

  // Check consecutive section height ratios
  for (let i = 0; i < rects.length - 1; i++) {
    const a = rects[i];
    const b = rects[i + 1];
    if (a.height > 50 && b.height > 50) {
      measurements.push(
        createMeasurement(
          `${a.selector} / ${b.selector}`,
          "section height ratio",
          Math.max(a.height, b.height),
          Math.min(a.height, b.height),
          tolerance
        )
      );
    }
  }

  // Check width/height of major sections
  for (const rect of rects) {
    if (rect.width > 100 && rect.height > 100) {
      measurements.push(
        createMeasurement(
          rect.selector,
          "width/height ratio",
          Math.max(rect.width, rect.height),
          Math.min(rect.width, rect.height),
          tolerance
        )
      );
    }
  }

  return measurements;
}

// --- Typography Extraction ---

export async function extractTypographyMeasurements(
  page: Page,
  scopeSelector: string,
  tolerance: number
): Promise<Measurement[]> {
  const measurements: Measurement[] = [];

  const typo: RawTypography[] = await page.evaluate((scope) => {
    const root = document.querySelector(scope) ?? document.body;
    const selectors = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "small"];
    const results: { selector: string; fontSize: number; lineHeight: number }[] = [];

    for (const sel of selectors) {
      const el = root.querySelector(sel) as HTMLElement | null;
      if (el) {
        const style = window.getComputedStyle(el);
        results.push({
          selector: sel,
          fontSize: parseFloat(style.fontSize),
          lineHeight: parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2,
        });
      }
    }
    return results;
  }, scopeSelector);

  // Check consecutive heading ratios
  const headings = typo.filter((t) => t.selector.startsWith("h"));
  for (let i = 0; i < headings.length - 1; i++) {
    const larger = headings[i];
    const smaller = headings[i + 1];
    if (larger.fontSize > 0 && smaller.fontSize > 0) {
      measurements.push(
        createMeasurement(
          `${larger.selector} / ${smaller.selector}`,
          "font-size ratio",
          larger.fontSize,
          smaller.fontSize,
          tolerance
        )
      );
    }
  }

  // Check heading to body text ratio
  const body = typo.find((t) => t.selector === "p");
  if (body && headings.length > 0) {
    measurements.push(
      createMeasurement(
        `${headings[0].selector} / p`,
        "heading-to-body font-size ratio",
        headings[0].fontSize,
        body.fontSize,
        tolerance
      )
    );
  }

  // Check line-height to font-size ratio for each element
  for (const t of typo) {
    if (t.lineHeight > 0 && t.fontSize > 0) {
      measurements.push(
        createMeasurement(
          t.selector,
          "line-height/font-size ratio",
          t.lineHeight,
          t.fontSize,
          tolerance
        )
      );
    }
  }

  return measurements;
}

// --- Spacing Extraction ---

export async function extractSpacingMeasurements(
  page: Page,
  scopeSelector: string,
  tolerance: number
): Promise<Measurement[]> {
  const measurements: Measurement[] = [];

  const spacings: RawSpacing[] = await page.evaluate((scope) => {
    const root = document.querySelector(scope) ?? document.body;
    const children = Array.from(root.children) as HTMLElement[];
    return children
      .filter((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== "none" && el.getBoundingClientRect().height > 0;
      })
      .slice(0, 20) // limit to first 20 elements
      .map((el, i) => {
        const style = window.getComputedStyle(el);
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : "";
        const cls = el.className && typeof el.className === "string"
          ? `.${el.className.split(" ").filter(Boolean)[0] || ""}`
          : "";
        return {
          selector: `${tag}${id}${cls}` || `${scope} > :nth-child(${i + 1})`,
          marginTop: parseFloat(style.marginTop) || 0,
          marginBottom: parseFloat(style.marginBottom) || 0,
          marginLeft: parseFloat(style.marginLeft) || 0,
          marginRight: parseFloat(style.marginRight) || 0,
          paddingTop: parseFloat(style.paddingTop) || 0,
          paddingBottom: parseFloat(style.paddingBottom) || 0,
          paddingLeft: parseFloat(style.paddingLeft) || 0,
          paddingRight: parseFloat(style.paddingRight) || 0,
        };
      });
  }, scopeSelector);

  for (const s of spacings) {
    const verticalMargin = s.marginTop + s.marginBottom;
    const verticalPadding = s.paddingTop + s.paddingBottom;
    const horizPadding = s.paddingLeft + s.paddingRight;

    // Vertical margin vs padding
    if (verticalMargin > 5 && verticalPadding > 5) {
      measurements.push(
        createMeasurement(
          s.selector,
          "vertical margin/padding ratio",
          Math.max(verticalMargin, verticalPadding),
          Math.min(verticalMargin, verticalPadding),
          tolerance
        )
      );
    }

    // Horizontal vs vertical padding
    if (horizPadding > 5 && verticalPadding > 5) {
      measurements.push(
        createMeasurement(
          s.selector,
          "horizontal/vertical padding ratio",
          Math.max(horizPadding, verticalPadding),
          Math.min(horizPadding, verticalPadding),
          tolerance
        )
      );
    }
  }

  // Consecutive element spacing ratios
  for (let i = 0; i < spacings.length - 1; i++) {
    const a = spacings[i];
    const b = spacings[i + 1];
    const gapA = a.marginBottom;
    const gapB = b.marginTop;
    // Use the combined gap between elements
    const gap = gapA + gapB;
    const padding = b.paddingTop + b.paddingBottom;
    if (gap > 5 && padding > 5) {
      measurements.push(
        createMeasurement(
          `${a.selector} → ${b.selector}`,
          "gap/padding ratio",
          Math.max(gap, padding),
          Math.min(gap, padding),
          tolerance
        )
      );
    }
  }

  return measurements;
}

// --- Element Extraction ---

export async function extractElementMeasurements(
  page: Page,
  selector: string,
  includeChildren: boolean,
  tolerance: number
): Promise<Measurement[]> {
  const measurements: Measurement[] = [];

  const data = await page.evaluate(
    ({ sel, children }) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) return null;

      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const parent = el.parentElement;
      const parentRect = parent?.getBoundingClientRect();

      const result: {
        width: number;
        height: number;
        paddingH: number;
        paddingV: number;
        parentWidth: number;
        parentHeight: number;
        children: { selector: string; width: number; height: number }[];
      } = {
        width: rect.width,
        height: rect.height,
        paddingH: parseFloat(style.paddingLeft) + parseFloat(style.paddingRight),
        paddingV: parseFloat(style.paddingTop) + parseFloat(style.paddingBottom),
        parentWidth: parentRect?.width ?? 0,
        parentHeight: parentRect?.height ?? 0,
        children: [],
      };

      if (children) {
        const kids = Array.from(el.children) as HTMLElement[];
        result.children = kids
          .filter((k) => {
            const s = window.getComputedStyle(k);
            return s.display !== "none";
          })
          .map((k, i) => {
            const kr = k.getBoundingClientRect();
            const tag = k.tagName.toLowerCase();
            return {
              selector: `${sel} > ${tag}:nth-child(${i + 1})`,
              width: kr.width,
              height: kr.height,
            };
          });
      }

      return result;
    },
    { sel: selector, children: includeChildren }
  );

  if (!data) {
    return measurements;
  }

  // Element width/height ratio
  if (data.width > 0 && data.height > 0) {
    measurements.push(
      createMeasurement(
        selector,
        "width/height ratio",
        Math.max(data.width, data.height),
        Math.min(data.width, data.height),
        tolerance
      )
    );
  }

  // Element width relative to parent
  if (data.parentWidth > 0 && data.width > 0) {
    measurements.push(
      createMeasurement(
        selector,
        "element/parent width ratio",
        data.parentWidth,
        data.width,
        tolerance
      )
    );
  }

  // Padding horizontal vs vertical
  if (data.paddingH > 5 && data.paddingV > 5) {
    measurements.push(
      createMeasurement(
        selector,
        "horizontal/vertical padding ratio",
        Math.max(data.paddingH, data.paddingV),
        Math.min(data.paddingH, data.paddingV),
        tolerance
      )
    );
  }

  // Children proportions relative to parent
  for (const child of data.children) {
    if (child.width > 0 && data.width > 0) {
      measurements.push(
        createMeasurement(
          child.selector,
          "child/parent width ratio",
          data.width,
          child.width,
          tolerance
        )
      );
    }
  }

  return measurements;
}
