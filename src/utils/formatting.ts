import type { AnalysisResult, CategoryWeights, FullReport, Measurement, PageType, SectionReport } from "../engine/types.js";
import { gradeFromScore, scoreMeasurements } from "../engine/ratio-calculator.js";

export function buildFullReport(
  url: string,
  viewport: { width: number; height: number },
  analyses: AnalysisResult[],
  sections?: SectionReport[],
  customWeights?: CategoryWeights,
  gradeThresholds?: { A: number; B: number; C: number; D: number },
  pageType?: PageType
): FullReport {
  const weights: Record<string, number> = customWeights ? { ...customWeights } : {
    layout: 0.30,
    typography: 0.22,
    spacing: 0.22,
    element: 0.11,
    density: 0.08,
    noise: 0.07,
  };

  let weightedSum = 0;
  let weightTotal = 0;
  for (const a of analyses) {
    const w = weights[a.category] ?? 0.25;
    weightedSum += a.score * w;
    weightTotal += w;
  }

  const overall_score = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0;

  const allMeasurements = analyses.flatMap((a) => a.measurements);
  const sorted = [...allMeasurements].sort((a, b) => b.deviation_pct - a.deviation_pct);

  // Deduplicate measurements with same element + property (from multiple sections)
  const seen = new Set<string>();
  const deduped = sorted.filter((m) => {
    const key = `${m.element}|${m.property}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const top_issues = deduped.filter((m) => !m.pass).slice(0, 10);
  const top_strengths = deduped
    .filter((m) => m.pass)
    .sort((a, b) => a.deviation_pct - b.deviation_pct)
    .slice(0, 5);

  const recommendations = top_issues.map(
    (m) => `${m.element} [${m.property}]: ${m.suggestion}`
  );

  const sectionList = sections ?? [];
  const first_contact: SectionReport = sectionList.length > 0
    ? sectionList[0]
    : {
        label: "First Contact (viewport)",
        scroll_y: 0,
        viewport,
        analyses,
        score: overall_score,
        grade: gradeFromScore(overall_score, gradeThresholds),
        top_issues,
      };

  return {
    url,
    viewport,
    timestamp: new Date().toISOString(),
    page_type: pageType,
    first_contact,
    sections: sectionList,
    analyses,
    overall_score,
    grade: gradeFromScore(overall_score, gradeThresholds),
    top_issues,
    top_strengths,
    recommendations,
  };
}

export function formatAnalysisResult(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}

function formatSectionSummary(section: SectionReport) {
  return {
    label: section.label,
    scroll_y: section.scroll_y,
    score: section.score,
    grade: section.grade,
    category_scores: Object.fromEntries(
      section.analyses.map((a) => [a.category, { score: a.score, summary: a.summary }])
    ),
    top_issues: section.top_issues.map((m) => ({
      element: m.element,
      property: m.property,
      deviation_pct: m.deviation_pct,
      suggestion: m.suggestion,
    })),
  };
}

export function formatFullReport(report: FullReport, format: "detailed" | "summary"): string {
  if (format === "summary") {
    return JSON.stringify(
      {
        url: report.url,
        viewport: report.viewport,
        overall_score: report.overall_score,
        grade: report.grade,
        first_contact: formatSectionSummary(report.first_contact),
        sections: report.sections.map(formatSectionSummary),
        category_scores: Object.fromEntries(
          report.analyses.map((a) => [a.category, { score: a.score, summary: a.summary }])
        ),
        top_issues: report.top_issues.map((m) => ({
          element: m.element,
          property: m.property,
          deviation_pct: m.deviation_pct,
          suggestion: m.suggestion,
        })),
        recommendations: report.recommendations,
      },
      null,
      2
    );
  }
  // For detailed, strip screenshots from JSON (they're returned as images)
  const output = {
    ...report,
    first_contact: { ...report.first_contact, screenshot: undefined },
    sections: report.sections.map((s) => ({ ...s, screenshot: undefined })),
  };
  return JSON.stringify(output, null, 2);
}
