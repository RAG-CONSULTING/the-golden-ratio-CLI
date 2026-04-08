import type { Page } from "playwright-core";
import type { Measurement } from "./types.js";

/**
 * Injects golden ratio visual overlays onto the page and takes a screenshot.
 * When scrollY is provided, scrolls to that position and captures only the viewport.
 * Returns the screenshot as a base64-encoded PNG.
 */
export async function captureWithOverlay(
  page: Page,
  measurements: Measurement[],
  scrollY?: number
): Promise<string> {
  // Inject overlay container and styles
  await page.evaluate((data) => {
    const overlay = document.createElement("div");
    overlay.id = "gr-overlay";
    overlay.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999999;";
    document.body.appendChild(overlay);

    const style = document.createElement("style");
    style.textContent = `
      .gr-box { position: absolute; pointer-events: none; }
      .gr-box--pass { border: 2px solid rgba(34, 197, 94, 0.8); }
      .gr-box--fail { border: 2px solid rgba(239, 68, 68, 0.8); }
      .gr-label {
        position: absolute; top: -22px; left: 0;
        font: bold 11px/1 system-ui, sans-serif;
        padding: 2px 6px; border-radius: 3px;
        white-space: nowrap; color: #fff;
      }
      .gr-label--pass { background: rgba(34, 197, 94, 0.9); }
      .gr-label--fail { background: rgba(239, 68, 68, 0.9); }
      .gr-guide {
        position: absolute; pointer-events: none;
        border: 1px dashed rgba(234, 179, 8, 0.5);
      }
    `;
    document.body.appendChild(style);

    // Draw measurement boxes on elements we can find
    for (const m of data.measurements) {
      // Try to extract a CSS selector from the element field
      const selectors = m.element.split(" / ").map((s: string) => s.split(" → ")[0].trim());

      for (const sel of selectors) {
        try {
          const el = document.querySelector(sel);
          if (!el) continue;

          const rect = el.getBoundingClientRect();
          const scrollY = window.scrollY;
          const scrollX = window.scrollX;

          const box = document.createElement("div");
          box.className = `gr-box ${m.pass ? "gr-box--pass" : "gr-box--fail"}`;
          box.style.cssText = `
            left: ${rect.left + scrollX}px;
            top: ${rect.top + scrollY}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
          `;

          const label = document.createElement("div");
          label.className = `gr-label ${m.pass ? "gr-label--pass" : "gr-label--fail"}`;
          const icon = m.pass ? "✓" : "✗";
          label.textContent = `${icon} ${m.property}: ${m.actual_ratio} (${m.deviation_pct}%)`;
          box.appendChild(label);

          overlay.appendChild(box);
        } catch {
          // Selector may not be valid CSS — skip
        }
      }
    }

    // Draw golden ratio guide lines on the viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const phi = 1.618;

    // Vertical split line (content | sidebar at golden ratio)
    const splitX = Math.round(vw / phi);
    const vLine = document.createElement("div");
    vLine.className = "gr-guide";
    vLine.style.cssText = `left:${splitX}px;top:0;width:0;height:${document.documentElement.scrollHeight}px;border-right:1px dashed rgba(234,179,8,0.4);`;
    overlay.appendChild(vLine);

    // Horizontal split line
    const splitY = Math.round(vh / phi);
    const hLine = document.createElement("div");
    hLine.className = "gr-guide";
    hLine.style.cssText = `left:0;top:${splitY}px;width:100%;height:0;border-bottom:1px dashed rgba(234,179,8,0.4);`;
    overlay.appendChild(hLine);

  }, { measurements });

  // Scroll to position if specified, then capture viewport; otherwise full-page
  if (scrollY !== undefined) {
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(100); // let scroll settle
  }
  const buffer = await page.screenshot({
    fullPage: scrollY === undefined,
    type: "png",
  });

  // Clean up overlay
  await page.evaluate(() => {
    document.getElementById("gr-overlay")?.remove();
    document.querySelectorAll("style").forEach((s) => {
      if (s.textContent?.includes("gr-box")) s.remove();
    });
  });

  return buffer.toString("base64");
}
