import type { AnalysisResult, FullReport, SectionReport, Measurement } from "../engine/types.js";

function gradeColor(grade: string): string {
  switch (grade) {
    case "A": return "#22c55e";
    case "B": return "#84cc16";
    case "C": return "#eab308";
    case "D": return "#f97316";
    default:  return "#ef4444";
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  layout: "#3B82F6", typography: "#8B5CF6", spacing: "#F59E0B",
  element: "#14B8A6", density: "#EC4899", noise: "#10B981",
};

const CATEGORY_LABELS: Record<string, string> = {
  layout: "Layout", typography: "Typography", spacing: "Spacing",
  element: "Element", density: "Visual Density", noise: "Heatmap Noise",
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// --- Category-Specific SVG Visuals ---

function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  return "#ef4444";
}

function renderLayoutVisual(a: AnalysisResult): string {
  const W = 200, H = 70;
  const color = CATEGORY_COLORS.layout;
  // Find a width ratio measurement
  const widthM = a.measurements.find((m) => m.property.includes("width ratio") || m.property.includes("column"));
  const heightM = a.measurements.find((m) => m.property.includes("height ratio") || m.property.includes("section height"));

  let rects = "";
  const phi = 1.618;
  const idealSplit = W / phi;

  if (widthM) {
    const total = widthM.actual_value_a + widthM.actual_value_b;
    const splitPx = total > 0 ? (widthM.actual_value_a / total) * W : idealSplit;
    const fillColor = widthM.pass ? `${color}44` : "#ef444444";
    rects += `<rect x="2" y="2" width="${splitPx - 3}" height="${H - 4}" rx="3" fill="${fillColor}" stroke="${widthM.pass ? color : "#ef4444"}" stroke-width="1"/>`;
    rects += `<rect x="${splitPx + 1}" y="2" width="${W - splitPx - 3}" height="${H - 4}" rx="3" fill="${fillColor}" stroke="${widthM.pass ? color : "#ef4444"}" stroke-width="1" opacity="0.6"/>`;
    rects += `<text x="${splitPx / 2}" y="${H / 2 + 4}" text-anchor="middle" fill="${color}" font-size="10" font-weight="600">${Math.round(widthM.actual_value_a)}px</text>`;
    rects += `<text x="${splitPx + (W - splitPx) / 2}" y="${H / 2 + 4}" text-anchor="middle" fill="${color}" font-size="10" font-weight="600">${Math.round(widthM.actual_value_b)}px</text>`;
  } else if (heightM) {
    const fillColor = heightM.pass ? `${color}44` : "#ef444444";
    rects += `<rect x="2" y="2" width="${W / 2 - 3}" height="${H - 4}" rx="3" fill="${fillColor}" stroke="${heightM.pass ? color : "#ef4444"}" stroke-width="1"/>`;
    rects += `<rect x="${W / 2 + 1}" y="2" width="${W / 2 - 3}" height="${H - 4}" rx="3" fill="${fillColor}" stroke="${heightM.pass ? color : "#ef4444"}" stroke-width="1" opacity="0.6"/>`;
  } else {
    rects += `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="3" fill="${color}22" stroke="${color}" stroke-width="1" opacity="0.5"/>`;
  }

  // Golden ratio guide line
  rects += `<line x1="${idealSplit}" y1="0" x2="${idealSplit}" y2="${H}" stroke="${color}" stroke-width="1" stroke-dasharray="3,3" opacity="0.5"/>`;
  rects += `<text x="${idealSplit + 3}" y="11" fill="${color}" font-size="8" opacity="0.6">phi</text>`;

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
}

function renderTypographyVisual(a: AnalysisResult): string {
  const W = 200, H = 70;
  const color = CATEGORY_COLORS.typography;

  // Collect font size measurements to build scale bars
  const fontSizes: { label: string; size: number; pass: boolean }[] = [];
  for (const m of a.measurements) {
    if (m.property.includes("font-size ratio") || m.property.includes("heading-to-body")) {
      if (!fontSizes.find((f) => f.size === m.actual_value_a)) {
        fontSizes.push({ label: m.element.split(" / ")[0].split(":")[0], size: m.actual_value_a, pass: m.pass });
      }
      if (!fontSizes.find((f) => f.size === m.actual_value_b)) {
        fontSizes.push({ label: m.element.split(" / ").pop()?.split(":")[0] ?? "", size: m.actual_value_b, pass: m.pass });
      }
    }
  }
  fontSizes.sort((a, b) => b.size - a.size);
  const unique = fontSizes.slice(0, 5);

  let bars = "";
  if (unique.length > 0) {
    const maxSize = unique[0].size;
    const barH = Math.min(12, (H - 4) / unique.length - 2);
    unique.forEach((f, i) => {
      const barW = maxSize > 0 ? (f.size / maxSize) * (W - 50) : 50;
      const y = 4 + i * (barH + 3);
      const fillColor = f.pass ? `${color}66` : "#ef444466";
      bars += `<rect x="40" y="${y}" width="${barW}" height="${barH}" rx="2" fill="${fillColor}" stroke="${f.pass ? color : "#ef4444"}" stroke-width="0.5"/>`;
      bars += `<text x="2" y="${y + barH - 2}" fill="${color}" font-size="9" font-weight="600">${Math.round(f.size)}px</text>`;
      bars += `<text x="${42 + barW + 3}" y="${y + barH - 2}" fill="#888" font-size="8">${f.label}</text>`;
    });
  } else {
    bars = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="#666" font-size="10">No typography data</text>`;
  }

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
}

function renderSpacingVisual(a: AnalysisResult): string {
  const W = 200, H = 70;
  const color = CATEGORY_COLORS.spacing;

  // Draw concentric box model rings
  const m = a.measurements[0];
  const outerPad = 6;
  const innerPad = 18;

  let svg = "";
  // Outer ring (margin)
  const outerColor = m && m.pass ? `${color}33` : "#ef444433";
  svg += `<rect x="${outerPad}" y="${outerPad}" width="${W - outerPad * 2}" height="${H - outerPad * 2}" rx="4" fill="${outerColor}" stroke="${color}" stroke-width="1" opacity="0.7"/>`;
  svg += `<text x="${outerPad + 4}" y="${outerPad + 10}" fill="${color}" font-size="8" opacity="0.7">margin</text>`;

  // Inner ring (padding)
  const innerColor = m && m.pass ? `${color}22` : "#ef444422";
  svg += `<rect x="${innerPad}" y="${innerPad}" width="${W - innerPad * 2}" height="${H - innerPad * 2}" rx="3" fill="${innerColor}" stroke="${color}" stroke-width="1" stroke-dasharray="3,2" opacity="0.7"/>`;
  svg += `<text x="${innerPad + 4}" y="${innerPad + 10}" fill="${color}" font-size="8" opacity="0.7">padding</text>`;

  // Content core
  svg += `<rect x="${innerPad + 10}" y="${innerPad + 10}" width="${W - (innerPad + 10) * 2}" height="${H - (innerPad + 10) * 2}" rx="2" fill="${color}11" stroke="${color}55" stroke-width="0.5"/>`;

  // Show ratio if available
  if (m) {
    svg += `<text x="${W / 2}" y="${H / 2 + 4}" text-anchor="middle" fill="${color}" font-size="10" font-weight="600">${m.actual_ratio}x</text>`;
  }

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`;
}

function renderDensityVisual(a: AnalysisResult): string {
  const W = 200, H = 70;
  const color = CATEGORY_COLORS.density;

  const contentM = a.measurements.find((m) => m.property === "content/whitespace ratio");
  const phi = 1.618;
  const idealFill = 1 / phi; // ~61.8% content

  let fillPct = idealFill;
  let pass = true;
  if (contentM) {
    const total = contentM.actual_value_a + contentM.actual_value_b;
    fillPct = total > 0 ? Math.max(contentM.actual_value_a, contentM.actual_value_b) / total : idealFill;
    pass = contentM.pass;
  }

  const fillH = Math.round(fillPct * (H - 4));
  const fillColor = pass ? `${color}55` : "#ef444455";
  const idealY = Math.round((1 - idealFill) * (H - 4)) + 2;

  let svg = "";
  // Viewport frame
  svg += `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="4" fill="#1e1e1e" stroke="${color}" stroke-width="1"/>`;
  // Fill from bottom
  svg += `<rect x="3" y="${H - 2 - fillH}" width="${W - 6}" height="${fillH}" rx="0 0 3 3" fill="${fillColor}"/>`;
  // Ideal phi line
  svg += `<line x1="2" y1="${idealY}" x2="${W - 2}" y2="${idealY}" stroke="${color}" stroke-width="1" stroke-dasharray="4,3"/>`;
  svg += `<text x="${W - 4}" y="${idealY - 3}" text-anchor="end" fill="${color}" font-size="8" opacity="0.8">phi 61.8%</text>`;
  // Actual percentage
  svg += `<text x="${W / 2}" y="${H / 2 + 4}" text-anchor="middle" fill="#fff" font-size="12" font-weight="700">${Math.round(fillPct * 100)}%</text>`;
  svg += `<text x="${W / 2}" y="${H / 2 + 15}" text-anchor="middle" fill="#888" font-size="8">content fill</text>`;

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`;
}

function renderNoiseVisual(a: AnalysisResult): string {
  const W = 200, H = 70;
  const color = CATEGORY_COLORS.noise;

  const sizeM = a.measurements.find((m) => m.property.includes("largest/median"));
  const countM = a.measurements.find((m) => m.property.includes("large/small"));
  const clusterM = a.measurements.find((m) => m.property.includes("cluster"));

  // Generate a scatter of dots representing element size distribution
  let svg = "";
  svg += `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="4" fill="#1e1e1e" stroke="${color}" stroke-width="0.5"/>`;

  // Large dots (meaningful elements)
  const largeCount = countM ? Math.min(Math.round(countM.actual_value_a), 8) : 4;
  const smallCount = countM ? Math.min(Math.round(countM.actual_value_b), 15) : 6;

  // Draw cluster zone if available
  if (clusterM && clusterM.actual_value_a > 0) {
    const clusterRatio = clusterM.actual_value_a / (clusterM.actual_value_a + clusterM.actual_value_b);
    const clusterW = Math.round(clusterRatio * (W - 20));
    svg += `<rect x="10" y="8" width="${clusterW}" height="${H - 16}" rx="6" fill="${color}15" stroke="${color}" stroke-width="0.5" stroke-dasharray="2,2"/>`;
    svg += `<text x="${10 + clusterW / 2}" y="${H - 6}" text-anchor="middle" fill="${color}" font-size="7" opacity="0.6">cluster</text>`;
  }

  // Large element dots
  for (let i = 0; i < largeCount; i++) {
    const x = 20 + (i * (W - 40)) / Math.max(largeCount - 1, 1);
    const y = 15 + (i % 3) * 14;
    const r = 6 + (i === 0 ? 4 : 0); // Hero element is bigger
    const dotColor = i === 0 ? color : `${color}aa`;
    svg += `<circle cx="${x}" cy="${y}" r="${r}" fill="${dotColor}44" stroke="${dotColor}" stroke-width="1"/>`;
  }

  // Small element dots (noise)
  for (let i = 0; i < smallCount; i++) {
    const x = 15 + Math.random() * (W - 30);
    const y = 10 + Math.random() * (H - 20);
    svg += `<circle cx="${x}" cy="${y}" r="2" fill="#ef444466" stroke="#ef444488" stroke-width="0.5"/>`;
  }

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`;
}

function renderElementVisual(a: AnalysisResult): string {
  const W = 200, H = 70;
  const color = CATEGORY_COLORS.element;
  const m = a.measurements[0];

  let svg = `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="4" fill="${color}15" stroke="${color}" stroke-width="1"/>`;
  if (m) {
    // Show width/height as nested rectangles
    const innerW = Math.round((W - 20) / (m.actual_ratio > 1 ? 1 : m.actual_ratio));
    const innerH = Math.round((H - 20) / (m.actual_ratio > 1 ? m.actual_ratio : 1));
    svg += `<rect x="${(W - innerW) / 2}" y="${(H - innerH) / 2}" width="${innerW}" height="${innerH}" rx="2" fill="${m.pass ? color + "33" : "#ef444433"}" stroke="${m.pass ? color : "#ef4444"}" stroke-width="1"/>`;
    svg += `<text x="${W / 2}" y="${H / 2 + 4}" text-anchor="middle" fill="${color}" font-size="10" font-weight="600">${m.actual_ratio}x</text>`;
  }
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`;
}

function renderCategoryVisual(a: AnalysisResult): string {
  switch (a.category) {
    case "layout":     return renderLayoutVisual(a);
    case "typography": return renderTypographyVisual(a);
    case "spacing":    return renderSpacingVisual(a);
    case "density":    return renderDensityVisual(a);
    case "noise":      return renderNoiseVisual(a);
    case "element":    return renderElementVisual(a);
    default:           return "";
  }
}

function renderMeasurementRow(m: Measurement): string {
  const status = m.pass
    ? `<span class="pass">&#10003;</span>`
    : `<span class="fail">&#10007;</span>`;
  return `
    <tr class="${m.pass ? "row-pass" : "row-fail"}">
      <td>${status}</td>
      <td class="mono">${escapeHtml(m.element)}</td>
      <td>${escapeHtml(m.property)}</td>
      <td class="num">${m.actual_ratio}</td>
      <td class="num">${m.deviation_pct}%</td>
      <td class="suggestion">${m.pass ? "" : escapeHtml(m.suggestion)}</td>
    </tr>`;
}

function renderSection(section: SectionReport, index: number): string {
  const gc = gradeColor(section.grade);
  const hasScreenshot = !!section.screenshot;

  let categoryRows = "";
  for (const a of section.analyses) {
    if (a.measurements.length === 0) continue;
    const passCount = a.measurements.filter((m) => m.pass).length;
    const catColor = CATEGORY_COLORS[a.category] ?? "#888";
    const catLabel = CATEGORY_LABELS[a.category] ?? a.category;
    const sc = scoreColor(a.score);
    categoryRows += `
      <div class="cat-card" style="border-left: 3px solid ${catColor}">
        <div class="cat-visual">${renderCategoryVisual(a)}</div>
        <div class="cat-info">
          <div class="cat-name" style="color:${catColor}">${catLabel}</div>
          <div class="cat-score-line">
            <span class="cat-grade" style="background:${sc}">${a.score >= 90 ? "A" : a.score >= 80 ? "B" : a.score >= 70 ? "C" : a.score >= 60 ? "D" : "F"}</span>
            <span class="cat-score-val">${a.score}/100</span>
          </div>
          <div class="cat-bar-wrap"><span class="cat-bar" style="width:${a.score}%;background:${catColor}"></span></div>
          <div class="cat-detail">${passCount}/${a.measurements.length} passing</div>
        </div>
      </div>`;
  }

  let issueRows = "";
  for (const m of section.top_issues) {
    issueRows += renderMeasurementRow(m);
  }

  let measurementTable = "";
  const allMeasurements = section.analyses.flatMap((a) => a.measurements);
  if (allMeasurements.length > 0) {
    let rows = "";
    for (const m of allMeasurements) {
      rows += renderMeasurementRow(m);
    }
    measurementTable = `
      <details class="measurements-detail">
        <summary>All measurements (${allMeasurements.length})</summary>
        <table class="measurements-table">
          <thead><tr><th></th><th>Element</th><th>Property</th><th>Ratio</th><th>Dev%</th><th>Suggestion</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </details>`;
  }

  return `
    <section class="report-section" id="section-${index}">
      <div class="section-header">
        <h2>${escapeHtml(section.label)}</h2>
        <div class="grade-badge" style="background:${gc}">${section.grade}</div>
        <div class="score-num">Score: ${section.score}</div>
      </div>

      ${hasScreenshot ? `<div class="screenshot-wrap"><img src="data:image/png;base64,${section.screenshot}" alt="${escapeHtml(section.label)} screenshot" /></div>` : ""}

      <div class="category-scores">${categoryRows}</div>

      ${section.top_issues.length > 0 ? `
        <div class="issues-block">
          <h3>Top Issues</h3>
          <table class="measurements-table">
            <thead><tr><th></th><th>Element</th><th>Property</th><th>Ratio</th><th>Dev%</th><th>Suggestion</th></tr></thead>
            <tbody>${issueRows}</tbody>
          </table>
        </div>
      ` : `<p class="no-issues">No issues found in this section.</p>`}

      ${measurementTable}
    </section>`;
}

export function generateHtmlReport(report: FullReport, fullPageScreenshot?: string): string {
  const gc = gradeColor(report.grade);
  const timestamp = new Date(report.timestamp).toLocaleString();

  // Navigation links
  let navLinks = "";
  for (let i = 0; i < report.sections.length; i++) {
    const s = report.sections[i];
    const sgc = gradeColor(s.grade);
    navLinks += `<a href="#section-${i}" class="nav-link"><span class="nav-grade" style="background:${sgc}">${s.grade}</span> ${escapeHtml(s.label)}</a>`;
  }

  // Overall category breakdown
  let overallCategories = "";
  for (const a of report.analyses) {
    const passCount = a.measurements.filter((m) => m.pass).length;
    const catColor = CATEGORY_COLORS[a.category] ?? "#888";
    const catLabel = CATEGORY_LABELS[a.category] ?? a.category;
    const sc = scoreColor(a.score);
    overallCategories += `
      <div class="cat-card overview-cat-card" style="border-left: 3px solid ${catColor}">
        <div class="cat-visual">${renderCategoryVisual(a)}</div>
        <div class="cat-info">
          <div class="cat-name" style="color:${catColor}">${catLabel}</div>
          <div class="cat-score-line">
            <span class="cat-grade" style="background:${sc}">${a.score >= 90 ? "A" : a.score >= 80 ? "B" : a.score >= 70 ? "C" : a.score >= 60 ? "D" : "F"}</span>
            <span class="cat-score-val">${a.score}/100</span>
          </div>
          <div class="cat-bar-wrap"><span class="cat-bar" style="width:${a.score}%;background:${catColor}"></span></div>
          <div class="overview-cat-detail">${passCount}/${a.measurements.length} proportions within tolerance</div>
        </div>
      </div>`;
  }

  // Recommendations
  let recsHtml = "";
  for (const rec of report.recommendations) {
    recsHtml += `<li>${escapeHtml(rec)}</li>`;
  }

  // Section cards
  let sectionsHtml = "";
  for (let i = 0; i < report.sections.length; i++) {
    sectionsHtml += renderSection(report.sections[i], i);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Golden Ratio Report - ${escapeHtml(report.url)}</title>
<style>
  :root {
    --bg: #0a0a0a; --surface: #141414; --surface2: #1e1e1e;
    --border: #2a2a2a; --text: #e5e5e5; --text-dim: #888;
    --gold: #eab308; --gold-dim: rgba(234,179,8,0.15);
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font: 14px/1.6 system-ui, -apple-system, sans-serif; }
  .container { max-width: 1200px; margin: 0 auto; padding: 24px; }

  /* Header */
  .report-header { text-align: center; padding: 48px 0 32px; border-bottom: 1px solid var(--border); margin-bottom: 32px; }
  .report-header h1 { font-size: 28px; font-weight: 700; color: var(--gold); margin-bottom: 4px; }
  .report-header .url { color: var(--text-dim); font-size: 13px; word-break: break-all; }
  .report-header .meta { color: var(--text-dim); font-size: 12px; margin-top: 8px; }
  .overall-grade { display: inline-flex; align-items: center; justify-content: center; width: 80px; height: 80px; border-radius: 50%; font-size: 36px; font-weight: 800; color: #fff; margin: 20px 0 8px; }
  .overall-score { font-size: 18px; color: var(--text-dim); }

  /* Navigation */
  .section-nav { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 32px; padding: 16px; background: var(--surface); border-radius: 8px; border: 1px solid var(--border); }
  .nav-link { text-decoration: none; color: var(--text); font-size: 12px; padding: 6px 12px; border-radius: 6px; background: var(--surface2); border: 1px solid var(--border); transition: background 0.15s; display: flex; align-items: center; gap: 6px; }
  .nav-link:hover { background: var(--border); }
  .nav-grade { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 4px; font-size: 11px; font-weight: 700; color: #fff; }

  /* Overview */
  .overview { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  @media (max-width: 768px) { .overview { grid-template-columns: 1fr; } }
  .overview-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; }
  .overview-card h3 { font-size: 14px; color: var(--gold); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
  .overview-cat { margin-bottom: 12px; }
  .overview-cat-header { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
  .overview-cat-score { font-weight: 600; }
  .overview-cat-detail { font-size: 11px; color: var(--text-dim); margin-top: 2px; }

  /* Category cards */
  .cat-card { display: flex; gap: 14px; align-items: center; padding: 12px 14px; background: var(--surface2); border-radius: 6px; margin-bottom: 8px; }
  .cat-visual { flex-shrink: 0; }
  .cat-visual svg { display: block; border-radius: 4px; }
  .cat-info { flex: 1; min-width: 0; }
  .cat-name { font-size: 12px; font-weight: 700; text-transform: capitalize; margin-bottom: 4px; }
  .cat-score-line { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .cat-grade { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 4px; font-size: 10px; font-weight: 800; color: #fff; }
  .cat-score-val { font-size: 13px; font-weight: 600; }
  .cat-bar-wrap { height: 4px; background: var(--bg); border-radius: 2px; overflow: hidden; margin-bottom: 3px; }
  .cat-bar { height: 100%; border-radius: 2px; }
  .cat-detail { color: var(--text-dim); font-size: 10px; }

  /* Category scores grid in section */
  .category-scores { padding: 16px 20px; border-bottom: 1px solid var(--border); display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 8px; }
  @media (max-width: 700px) { .category-scores { grid-template-columns: 1fr; } }

  /* Overview category cards */
  .overview-cat-card { margin-bottom: 10px; }

  /* Recommendations */
  .recs-list { list-style: none; }
  .recs-list li { padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 12px; color: var(--text-dim); }
  .recs-list li:last-child { border-bottom: none; }

  /* Full page screenshot */
  .full-page-screenshot { margin-bottom: 32px; text-align: center; }
  .full-page-screenshot img { max-width: 100%; max-height: 600px; border: 1px solid var(--border); border-radius: 8px; }
  .full-page-screenshot h3 { font-size: 14px; color: var(--gold); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }

  /* Section cards */
  .report-section { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 24px; overflow: hidden; }
  .section-header { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--border); }
  .section-header h2 { font-size: 16px; flex: 1; }
  .grade-badge { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 6px; font-size: 16px; font-weight: 800; color: #fff; }
  .score-num { font-size: 13px; color: var(--text-dim); }

  /* Screenshots */
  .screenshot-wrap { padding: 16px; background: var(--bg); }
  .screenshot-wrap img { width: 100%; border-radius: 4px; border: 1px solid var(--border); }

  /* Category scores in section */
  .category-scores { padding: 16px 20px; border-bottom: 1px solid var(--border); }

  /* Issues */
  .issues-block { padding: 16px 20px; }
  .issues-block h3 { font-size: 13px; color: #ef4444; margin-bottom: 8px; }
  .no-issues { padding: 12px 20px; color: var(--text-dim); font-size: 12px; }

  /* Measurements table */
  .measurements-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .measurements-table th { text-align: left; padding: 6px 8px; background: var(--surface2); color: var(--text-dim); font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
  .measurements-table td { padding: 6px 8px; border-bottom: 1px solid var(--border); vertical-align: top; }
  .row-pass td { color: var(--text-dim); }
  .row-fail td { color: var(--text); }
  .pass { color: #22c55e; font-weight: bold; }
  .fail { color: #ef4444; font-weight: bold; }
  .mono { font-family: 'SF Mono', Consolas, monospace; font-size: 10px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .num { font-family: 'SF Mono', Consolas, monospace; text-align: right; }
  .suggestion { font-size: 10px; color: var(--text-dim); max-width: 250px; }

  /* Details/Summary */
  .measurements-detail { padding: 0 20px 16px; }
  .measurements-detail summary { cursor: pointer; font-size: 12px; color: var(--gold); padding: 8px 0; }
  .measurements-detail summary:hover { text-decoration: underline; }

  /* Footer */
  .report-footer { text-align: center; padding: 32px 0; color: var(--text-dim); font-size: 11px; border-top: 1px solid var(--border); margin-top: 32px; }
</style>
</head>
<body>
<div class="container">

  <header class="report-header">
    <h1>Golden Ratio Report</h1>
    <div class="url">${escapeHtml(report.url)}</div>
    <div class="overall-grade" style="background:${gc}">${report.grade}</div>
    <div class="overall-score">Overall Score: ${report.overall_score} / 100</div>
    <div class="meta">
      ${report.page_type && report.page_type !== "general" ? `Page type: <strong>${report.page_type}</strong> | ` : ""}
      Viewport: ${report.viewport.width}x${report.viewport.height} |
      ${report.sections.length} sections analyzed |
      ${timestamp}
    </div>
  </header>

  <nav class="section-nav">${navLinks}</nav>

  <div class="overview">
    <div class="overview-card">
      <h3>Category Scores</h3>
      ${overallCategories}
    </div>
    <div class="overview-card">
      <h3>Recommendations</h3>
      ${report.recommendations.length > 0
        ? `<ol class="recs-list">${recsHtml}</ol>`
        : `<p style="color:var(--text-dim);font-size:12px;">No recommendations - all measurements within tolerance.</p>`
      }
    </div>
  </div>

  ${fullPageScreenshot ? `
    <div class="full-page-screenshot">
      <h3>Full Page Overview</h3>
      <img src="data:image/png;base64,${fullPageScreenshot}" alt="Full page screenshot with golden ratio overlay" />
    </div>
  ` : ""}

  ${sectionsHtml}

  <footer class="report-footer">
    Generated by Golden Ratio CLI | phi = 1.618
  </footer>

</div>
</body>
</html>`;
}
