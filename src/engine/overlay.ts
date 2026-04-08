import type { Page } from "playwright-core";
import type { Measurement } from "./types.js";

/**
 * Injects golden ratio visual overlays onto the page and takes a screenshot.
 * Draws pass/fail boxes, dimension line annotations showing what's being measured,
 * and ratio tags showing the calculation.
 * When scrollY is provided, scrolls to that position and captures only the viewport.
 * Returns the screenshot as a base64-encoded PNG.
 */
export async function captureWithOverlay(
  page: Page,
  measurements: Measurement[],
  scrollY?: number
): Promise<string> {
  // Inject overlay container, styles, and annotations
  await page.evaluate((data) => {
    const overlay = document.createElement("div");
    overlay.id = "gr-overlay";
    overlay.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999999;";
    document.body.appendChild(overlay);

    // --- Color scheme by category ---
    const categoryColors: Record<string, { line: string; fill: string; label: string }> = {
      layout:     { line: "#3B82F6", fill: "rgba(59, 130, 246, 0.12)",  label: "rgba(59, 130, 246, 0.9)" },
      typography: { line: "#8B5CF6", fill: "rgba(139, 92, 246, 0.12)",  label: "rgba(139, 92, 246, 0.9)" },
      spacing:    { line: "#F59E0B", fill: "rgba(245, 158, 11, 0.12)",  label: "rgba(245, 158, 11, 0.9)" },
      element:    { line: "#14B8A6", fill: "rgba(20, 184, 166, 0.12)",  label: "rgba(20, 184, 166, 0.9)" },
    };
    const defaultColors = { line: "#9CA3AF", fill: "rgba(156, 163, 175, 0.12)", label: "rgba(156, 163, 175, 0.9)" };

    function getColors(m: any) {
      return categoryColors[m.category] || defaultColors;
    }

    // --- Inject styles ---
    const style = document.createElement("style");
    style.textContent = `
      .gr-box { position: absolute; pointer-events: none; }
      .gr-box--pass { border: 2px solid rgba(34, 197, 94, 0.7); }
      .gr-box--fail { border: 2px solid rgba(239, 68, 68, 0.7); }
      .gr-label {
        position: absolute; top: -22px; left: 0;
        font: bold 11px/1 system-ui, sans-serif;
        padding: 2px 6px; border-radius: 3px;
        white-space: nowrap; color: #fff;
      }
      .gr-label--pass { background: rgba(34, 197, 94, 0.9); }
      .gr-label--fail { background: rgba(239, 68, 68, 0.9); }
      .gr-dim-line {
        position: absolute; pointer-events: none;
      }
      .gr-dim-cap {
        position: absolute; pointer-events: none;
      }
      .gr-dim-label {
        position: absolute; pointer-events: none;
        font: bold 10px/1 system-ui, sans-serif;
        padding: 1px 4px; border-radius: 2px;
        color: #fff; white-space: nowrap;
      }
      .gr-ratio-tag {
        position: absolute; pointer-events: none;
        font: bold 11px/1.3 system-ui, sans-serif;
        padding: 4px 8px; border-radius: 4px;
        color: #fff; white-space: nowrap;
        box-shadow: 0 1px 4px rgba(0,0,0,0.4);
      }
      .gr-guide {
        position: absolute; pointer-events: none;
      }
    `;
    document.body.appendChild(style);

    const sY = window.scrollY;
    const sX = window.scrollX;

    // --- Label collision tracking ---
    const placedLabels: { x: number; y: number; w: number; h: number }[] = [];

    function findNonOverlappingY(x: number, y: number, w: number, h: number): number {
      let candidateY = y;
      for (let attempt = 0; attempt < 4; attempt++) {
        let overlaps = false;
        for (const placed of placedLabels) {
          if (
            candidateY < placed.y + placed.h &&
            candidateY + h > placed.y &&
            x < placed.x + placed.w &&
            x + w > placed.x
          ) {
            overlaps = true;
            candidateY = placed.y + placed.h + 3;
            break;
          }
        }
        if (!overlaps) break;
      }
      placedLabels.push({ x, y: candidateY, w, h });
      return candidateY;
    }

    // --- Drawing helpers ---

    function drawHorizontalDimLine(
      container: HTMLElement,
      x: number, y: number, width: number,
      label: string, color: string
    ) {
      // Main line
      const line = document.createElement("div");
      line.className = "gr-dim-line";
      line.style.cssText = `left:${x}px;top:${y}px;width:${width}px;height:2px;background:${color};`;
      container.appendChild(line);

      // Left cap
      const capL = document.createElement("div");
      capL.className = "gr-dim-cap";
      capL.style.cssText = `left:${x}px;top:${y - 4}px;width:2px;height:10px;background:${color};`;
      container.appendChild(capL);

      // Right cap
      const capR = document.createElement("div");
      capR.className = "gr-dim-cap";
      capR.style.cssText = `left:${x + width - 2}px;top:${y - 4}px;width:2px;height:10px;background:${color};`;
      container.appendChild(capR);

      // Label centered on line
      const lbl = document.createElement("div");
      lbl.className = "gr-dim-label";
      lbl.style.cssText = `left:${x + width / 2 - 20}px;top:${y - 16}px;background:${color};`;
      lbl.textContent = label;
      container.appendChild(lbl);
    }

    function drawVerticalDimLine(
      container: HTMLElement,
      x: number, y: number, height: number,
      label: string, color: string
    ) {
      // Main line
      const line = document.createElement("div");
      line.className = "gr-dim-line";
      line.style.cssText = `left:${x}px;top:${y}px;width:2px;height:${height}px;background:${color};`;
      container.appendChild(line);

      // Top cap
      const capT = document.createElement("div");
      capT.className = "gr-dim-cap";
      capT.style.cssText = `left:${x - 4}px;top:${y}px;width:10px;height:2px;background:${color};`;
      container.appendChild(capT);

      // Bottom cap
      const capB = document.createElement("div");
      capB.className = "gr-dim-cap";
      capB.style.cssText = `left:${x - 4}px;top:${y + height - 2}px;width:10px;height:2px;background:${color};`;
      container.appendChild(capB);

      // Label centered on line
      const lbl = document.createElement("div");
      lbl.className = "gr-dim-label";
      lbl.style.cssText = `left:${x + 6}px;top:${y + height / 2 - 7}px;background:${color};`;
      lbl.textContent = label;
      container.appendChild(lbl);
    }

    function drawRatioTag(
      container: HTMLElement,
      x: number, y: number,
      m: any, color: string
    ) {
      const tag = document.createElement("div");
      tag.className = "gr-ratio-tag";
      const icon = m.pass ? "✓" : "✗";
      const valA = Math.round(m.actual_value_a);
      const valB = Math.round(m.actual_value_b);
      tag.textContent = `${icon} ${valA}px : ${valB}px = ${m.actual_ratio} (φ ${m.target_ratio})`;
      const adjY = findNonOverlappingY(x, y, 250, 20);
      tag.style.cssText = `left:${x}px;top:${adjY}px;background:${color};`;
      container.appendChild(tag);
    }

    // --- Resolve element selectors to bounding rects ---
    function resolveRects(elementStr: string): DOMRect[] {
      const selectors = elementStr.split(" / ").map((s: string) => s.split(" → ")[0].trim());
      const rects: DOMRect[] = [];
      for (const sel of selectors) {
        try {
          const el = document.querySelector(sel);
          if (el) rects.push(el.getBoundingClientRect());
        } catch { /* skip invalid selectors */ }
      }
      return rects;
    }

    // --- Property-specific annotation renderers ---

    function annotateColumnWidth(m: any, container: HTMLElement) {
      const rects = resolveRects(m.element);
      if (rects.length < 2) return;
      const colors = getColors(m);
      const [r1, r2] = rects;
      const lineY = Math.max(r1.bottom, r2.bottom) + sY + 8;
      drawHorizontalDimLine(container, r1.left + sX, lineY, r1.width, `${Math.round(r1.width)}px`, colors.line);
      drawHorizontalDimLine(container, r2.left + sX, lineY + 22, r2.width, `${Math.round(r2.width)}px`, colors.line);
      drawRatioTag(container, Math.min(r1.left, r2.left) + sX, lineY + 44, m, colors.label);
    }

    function annotateSectionHeight(m: any, container: HTMLElement) {
      const rects = resolveRects(m.element);
      if (rects.length < 2) return;
      const colors = getColors(m);
      const [r1, r2] = rects;
      const lineX = Math.max(r1.right, r2.right) + sX + 8;
      drawVerticalDimLine(container, lineX, r1.top + sY, r1.height, `${Math.round(r1.height)}px`, colors.line);
      drawVerticalDimLine(container, lineX + 22, r2.top + sY, r2.height, `${Math.round(r2.height)}px`, colors.line);
      drawRatioTag(container, lineX + 30, (r1.top + r2.bottom) / 2 + sY, m, colors.label);
    }

    function annotateWidthHeight(m: any, container: HTMLElement) {
      const rects = resolveRects(m.element);
      if (rects.length < 1) return;
      const colors = getColors(m);
      const r = rects[0];
      // Width line below element
      drawHorizontalDimLine(container, r.left + sX, r.bottom + sY + 6, r.width, `${Math.round(r.width)}px`, colors.line);
      // Height line to the right
      drawVerticalDimLine(container, r.right + sX + 6, r.top + sY, r.height, `${Math.round(r.height)}px`, colors.line);
      // Ratio tag at bottom-right corner
      drawRatioTag(container, r.right + sX + 14, r.bottom + sY + 8, m, colors.label);
    }

    function annotateTypography(m: any, container: HTMLElement) {
      const rects = resolveRects(m.element);
      const colors = getColors(m);

      if (rects.length >= 2) {
        // Two text elements — show font sizes with connecting info
        const [r1, r2] = rects;
        // Font size labels to the left of each element
        const lbl1 = document.createElement("div");
        lbl1.className = "gr-dim-label";
        lbl1.style.cssText = `right:${window.innerWidth - r1.left + 4}px;top:${r1.top + sY + r1.height / 2 - 7}px;background:${colors.line};`;
        lbl1.textContent = `${Math.round(m.actual_value_a)}px`;
        container.appendChild(lbl1);

        const lbl2 = document.createElement("div");
        lbl2.className = "gr-dim-label";
        lbl2.style.cssText = `right:${window.innerWidth - r2.left + 4}px;top:${r2.top + sY + r2.height / 2 - 7}px;background:${colors.line};`;
        lbl2.textContent = `${Math.round(m.actual_value_b)}px`;
        container.appendChild(lbl2);

        // Connecting line between the two elements
        const connX = Math.min(r1.left, r2.left) + sX - 20;
        const connTop = Math.min(r1.top, r2.top) + sY;
        const connHeight = Math.max(r1.bottom, r2.bottom) - Math.min(r1.top, r2.top);
        const connLine = document.createElement("div");
        connLine.className = "gr-dim-line";
        connLine.style.cssText = `left:${connX}px;top:${connTop}px;width:2px;height:${connHeight}px;background:${colors.line};opacity:0.5;`;
        container.appendChild(connLine);

        // Ratio tag
        drawRatioTag(container, connX - 10, connTop + connHeight + 4, m, colors.label);
      } else if (rects.length === 1) {
        // Single element (line-height/font-size) — show both values
        const r = rects[0];
        const lbl = document.createElement("div");
        lbl.className = "gr-dim-label";
        lbl.style.cssText = `left:${r.right + sX + 6}px;top:${r.top + sY + r.height / 2 - 7}px;background:${colors.line};`;
        lbl.textContent = `${Math.round(m.actual_value_a)}/${Math.round(m.actual_value_b)}px`;
        container.appendChild(lbl);

        drawRatioTag(container, r.right + sX + 6, r.top + sY + r.height / 2 + 8, m, colors.label);
      }
    }

    function annotateSpacing(m: any, container: HTMLElement) {
      const rects = resolveRects(m.element);
      if (rects.length < 1) return;
      const colors = getColors(m);
      const r = rects[0];

      // Show the two values as a ratio tag near the element
      const valA = Math.round(m.actual_value_a);
      const valB = Math.round(m.actual_value_b);

      // Semi-transparent fill to highlight the element's spacing zone
      const fill = document.createElement("div");
      fill.style.cssText = `position:absolute;pointer-events:none;left:${r.left + sX}px;top:${r.top + sY}px;width:${r.width}px;height:${r.height}px;background:${colors.fill};border:1px solid ${colors.line};border-radius:2px;`;
      container.appendChild(fill);

      drawRatioTag(container, r.left + sX, r.bottom + sY + 4, m, colors.label);
    }

    function annotateGapPadding(m: any, container: HTMLElement) {
      const parts = m.element.split(" → ");
      if (parts.length < 2) { annotateSpacing(m, container); return; }
      const colors = getColors(m);

      try {
        const el1 = document.querySelector(parts[0].trim());
        const el2 = document.querySelector(parts[1].trim());
        if (!el1 || !el2) return;

        const r1 = el1.getBoundingClientRect();
        const r2 = el2.getBoundingClientRect();

        // Highlight the gap zone between elements
        const gapTop = r1.bottom + sY;
        const gapHeight = r2.top - r1.bottom;
        if (gapHeight > 0) {
          const gapFill = document.createElement("div");
          gapFill.style.cssText = `position:absolute;pointer-events:none;left:${Math.min(r1.left, r2.left) + sX}px;top:${gapTop}px;width:${Math.max(r1.width, r2.width)}px;height:${gapHeight}px;background:${colors.fill};border:1px dashed ${colors.line};`;
          container.appendChild(gapFill);

          const gapLabel = document.createElement("div");
          gapLabel.className = "gr-dim-label";
          gapLabel.style.cssText = `left:${Math.min(r1.left, r2.left) + sX + 4}px;top:${gapTop + gapHeight / 2 - 7}px;background:${colors.line};`;
          gapLabel.textContent = `gap: ${Math.round(m.actual_value_a > m.actual_value_b ? m.actual_value_a : m.actual_value_b)}px`;
          container.appendChild(gapLabel);
        }

        drawRatioTag(container, r2.left + sX, r2.bottom + sY + 4, m, colors.label);
      } catch { /* skip invalid selectors */ }
    }

    // --- Dispatcher: property → renderer ---
    const renderers: Record<string, (m: any, c: HTMLElement) => void> = {
      "column width ratio": annotateColumnWidth,
      "section height ratio": annotateSectionHeight,
      "width/height ratio": annotateWidthHeight,
      "font-size ratio": annotateTypography,
      "heading-to-body font-size ratio": annotateTypography,
      "line-height/font-size ratio": annotateTypography,
      "vertical margin/padding ratio": annotateSpacing,
      "horizontal/vertical padding ratio": annotateSpacing,
      "gap/padding ratio": annotateGapPadding,
      "element/parent width ratio": annotateWidthHeight,
      "child/parent width ratio": annotateWidthHeight,
    };

    // --- Select measurements to annotate (density limiting) ---
    // Top 3 failures + top 2 passes + up to 3 more, capped at 8
    const failures = [...data.measurements]
      .filter((m) => !m.pass)
      .sort((a, b) => b.deviation_pct - a.deviation_pct);
    const passes = [...data.measurements]
      .filter((m) => m.pass)
      .sort((a, b) => a.deviation_pct - b.deviation_pct);

    const annotated = new Set<number>();
    const toAnnotate: any[] = [];

    for (const m of failures.slice(0, 3)) {
      const idx = data.measurements.indexOf(m);
      if (!annotated.has(idx)) { annotated.add(idx); toAnnotate.push(m); }
    }
    for (const m of passes.slice(0, 2)) {
      const idx = data.measurements.indexOf(m);
      if (!annotated.has(idx)) { annotated.add(idx); toAnnotate.push(m); }
    }
    // Fill remaining slots
    for (const m of data.measurements) {
      if (toAnnotate.length >= 8) break;
      const idx = data.measurements.indexOf(m);
      if (!annotated.has(idx)) { annotated.add(idx); toAnnotate.push(m); }
    }

    // --- Draw pass/fail boxes on ALL measurements ---
    for (const m of data.measurements) {
      const selectors = m.element.split(" / ").map((s: string) => s.split(" → ")[0].trim());
      for (const sel of selectors) {
        try {
          const el = document.querySelector(sel);
          if (!el) continue;
          const rect = el.getBoundingClientRect();

          const box = document.createElement("div");
          box.className = `gr-box ${m.pass ? "gr-box--pass" : "gr-box--fail"}`;
          box.style.cssText = `
            left: ${rect.left + sX}px;
            top: ${rect.top + sY}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
          `;

          // Only add the simple text label if NOT getting a full annotation
          if (!toAnnotate.includes(m)) {
            const label = document.createElement("div");
            label.className = `gr-label ${m.pass ? "gr-label--pass" : "gr-label--fail"}`;
            const icon = m.pass ? "✓" : "✗";
            label.textContent = `${icon} ${m.property}: ${m.actual_ratio} (${m.deviation_pct}%)`;
            box.appendChild(label);
          }

          overlay.appendChild(box);
        } catch { /* skip invalid selectors */ }
      }
    }

    // --- Draw dimension annotations on selected measurements ---
    for (const m of toAnnotate) {
      const renderer = renderers[m.property];
      if (renderer) {
        try { renderer(m, overlay); } catch { /* skip render errors */ }
      }
    }

    // --- Golden Ratio Template Overlay ---
    // True golden rectangle subdivision: cut squares from alternating sides,
    // draw grid lines at each cut, and render the golden spiral as connected
    // SVG quarter-circle arcs through each square.
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const goldenColor = "rgba(234, 179, 8, 0.45)";
    const goldenColorFaint = "rgba(234, 179, 8, 0.18)";
    const spiralColor = "rgba(234, 179, 8, 0.7)";

    // --- Step 1: Compute square subdivision ---
    // At each step, cut a square (side = shorter dimension) from the rectangle.
    // Direction cycle (clockwise): 0=left, 1=top, 2=right, 3=bottom
    interface SquareStep {
      sx: number; sy: number; size: number;  // square position & side length
      cx: number; cy: number;                // arc center (corner shared with remaining rect)
      startX: number; startY: number;        // arc start point
      endX: number; endY: number;            // arc end point
    }
    const steps: SquareStep[] = [];

    let rx = 0, ry = sY, rw = vw, rh = vh;
    const maxSteps = 9;

    for (let i = 0; i < maxSteps && rw > 5 && rh > 5; i++) {
      const dir = i % 4;
      const size = Math.min(rw, rh); // square side = shorter dimension

      let sx: number, sy: number;    // square top-left
      let cx: number, cy: number;    // arc center
      let startX: number, startY: number;
      let endX: number, endY: number;

      switch (dir) {
        case 0: // Cut square from LEFT
          sx = rx; sy = ry;
          cx = rx + size; cy = ry + rh;      // bottom-right of square
          startX = rx; startY = ry + rh;      // bottom-left
          endX = rx + size; endY = ry;         // top-right (of square area, clamped to rect)
          // Draw vertical grid line at right edge of square
          const line0 = document.createElement("div");
          line0.className = "gr-guide";
          line0.style.cssText = `left:${rx + size}px;top:${ry}px;width:0;height:${rh}px;border-right:1px solid ${i < 2 ? goldenColor : goldenColorFaint};`;
          overlay.appendChild(line0);
          // Update remaining rect
          rx += size; rw -= size;
          break;

        case 1: // Cut square from TOP
          sx = rx; sy = ry;
          cx = rx; cy = ry + size;             // bottom-left of square
          startX = rx; startY = ry;            // top-left
          endX = rx + rw; endY = ry + size;    // bottom-right
          const line1 = document.createElement("div");
          line1.className = "gr-guide";
          line1.style.cssText = `left:${rx}px;top:${ry + size}px;width:${rw}px;height:0;border-bottom:1px solid ${i < 2 ? goldenColor : goldenColorFaint};`;
          overlay.appendChild(line1);
          ry += size; rh -= size;
          break;

        case 2: // Cut square from RIGHT
          sx = rx + rw - size; sy = ry;
          cx = rx + rw - size; cy = ry;        // top-left of square
          startX = rx + rw; startY = ry;       // top-right
          endX = rx + rw - size; endY = ry + rh; // bottom-left of square
          const line2 = document.createElement("div");
          line2.className = "gr-guide";
          line2.style.cssText = `left:${rx + rw - size}px;top:${ry}px;width:0;height:${rh}px;border-right:1px solid ${i < 2 ? goldenColor : goldenColorFaint};`;
          overlay.appendChild(line2);
          rw -= size;
          break;

        case 3: // Cut square from BOTTOM
          sx = rx; sy = ry + rh - size;
          cx = rx + rw; cy = ry + rh - size;  // top-right of square
          startX = rx + rw; startY = ry + rh;  // bottom-right
          endX = rx; endY = ry + rh - size;     // top-left of square
          const line3 = document.createElement("div");
          line3.className = "gr-guide";
          line3.style.cssText = `left:${rx}px;top:${ry + rh - size}px;width:${rw}px;height:0;border-bottom:1px solid ${i < 2 ? goldenColor : goldenColorFaint};`;
          overlay.appendChild(line3);
          rh -= size;
          break;
      }

      steps.push({ sx: sx!, sy: sy!, size, cx: cx!, cy: cy!, startX: startX!, startY: startY!, endX: endX!, endY: endY! });
    }

    // --- Step 2: Draw the golden spiral as an SVG path ---
    // Each step contributes a quarter-circle arc. Arcs connect end-to-end.
    if (steps.length > 0) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", String(vw));
      svg.setAttribute("height", String(document.documentElement.scrollHeight));
      svg.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;z-index:999998;overflow:visible;";

      let pathD = `M ${steps[0].startX} ${steps[0].startY}`;
      for (const step of steps) {
        // SVG arc: A rx ry x-rotation large-arc-flag sweep-flag endX endY
        // Quarter circle (90°), clockwise sweep
        pathD += ` A ${step.size} ${step.size} 0 0 1 ${step.endX} ${step.endY}`;
      }

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathD);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", spiralColor);
      path.setAttribute("stroke-width", "2.5");
      path.setAttribute("stroke-linecap", "round");
      svg.appendChild(path);

      overlay.appendChild(svg);
    }

    // --- Step 3: Labels on primary splits ---
    if (steps.length >= 2) {
      const s0 = steps[0];
      const lbl0 = document.createElement("div");
      lbl0.className = "gr-dim-label";
      lbl0.style.cssText = `left:${s0.sx + s0.size + 4}px;top:${s0.sy + 4}px;background:rgba(234,179,8,0.7);font-size:9px;`;
      lbl0.textContent = `φ ${s0.size}px | ${vw - s0.size}px`;
      overlay.appendChild(lbl0);

      const s1 = steps[1];
      const lbl1 = document.createElement("div");
      lbl1.className = "gr-dim-label";
      lbl1.style.cssText = `left:${s1.sx + 4}px;top:${s1.sy + s1.size + 4}px;background:rgba(234,179,8,0.7);font-size:9px;`;
      lbl1.textContent = `φ ${s1.size}px | ${vh - s1.size}px`;
      overlay.appendChild(lbl1);
    }

    // Outer viewport rectangle border
    const outerRect = document.createElement("div");
    outerRect.style.cssText = `position:absolute;pointer-events:none;left:0;top:${sY}px;width:${vw}px;height:${vh}px;border:2px solid ${goldenColor};box-sizing:border-box;`;
    overlay.appendChild(outerRect);

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
