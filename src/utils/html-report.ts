import type { FullReport, SectionReport, Measurement } from "../engine/types.js";

function gradeColor(grade: string): string {
  switch (grade) {
    case "A": return "#22c55e";
    case "B": return "#84cc16";
    case "C": return "#eab308";
    case "D": return "#f97316";
    default:  return "#ef4444";
  }
}

function categoryIcon(cat: string): string {
  switch (cat) {
    case "layout":     return "&#9638;";
    case "typography": return "&#9000;";
    case "spacing":    return "&#8942;";
    case "element":    return "&#11200;";
    default:           return "&#9679;";
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
    const passCount = a.measurements.filter((m) => m.pass).length;
    categoryRows += `
      <div class="cat-score">
        <span class="cat-icon">${categoryIcon(a.category)}</span>
        <span class="cat-name">${a.category}</span>
        <span class="cat-bar-wrap">
          <span class="cat-bar" style="width:${a.score}%;background:${a.score >= 80 ? "#22c55e" : a.score >= 60 ? "#eab308" : "#ef4444"}"></span>
        </span>
        <span class="cat-val">${a.score}</span>
        <span class="cat-detail">${passCount}/${a.measurements.length} passing</span>
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
    overallCategories += `
      <div class="overview-cat">
        <div class="overview-cat-header">
          <span>${categoryIcon(a.category)} ${a.category}</span>
          <span class="overview-cat-score">${a.score}/100</span>
        </div>
        <div class="cat-bar-wrap"><span class="cat-bar" style="width:${a.score}%;background:${a.score >= 80 ? "#22c55e" : a.score >= 60 ? "#eab308" : "#ef4444"}"></span></div>
        <div class="overview-cat-detail">${passCount}/${a.measurements.length} proportions within tolerance</div>
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

  /* Category bars */
  .cat-score { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 12px; }
  .cat-icon { font-size: 14px; width: 18px; text-align: center; }
  .cat-name { width: 80px; text-transform: capitalize; }
  .cat-bar-wrap { flex: 1; height: 6px; background: var(--surface2); border-radius: 3px; overflow: hidden; }
  .cat-bar { height: 100%; border-radius: 3px; transition: width 0.3s; }
  .cat-val { width: 28px; text-align: right; font-weight: 600; }
  .cat-detail { color: var(--text-dim); font-size: 11px; }

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
