import type { AnalysisResult, FullReport, Measurement } from "../engine/types.js";
import { gradeFromScore, scoreMeasurements } from "../engine/ratio-calculator.js";

export function buildFullReport(
  url: string,
  viewport: { width: number; height: number },
  analyses: AnalysisResult[]
): FullReport {
  const weights: Record<string, number> = {
    layout: 0.35,
    typography: 0.25,
    spacing: 0.25,
    element: 0.15,
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

  const top_issues = sorted.filter((m) => !m.pass).slice(0, 10);
  const top_strengths = [...allMeasurements]
    .sort((a, b) => a.deviation_pct - b.deviation_pct)
    .filter((m) => m.pass)
    .slice(0, 5);

  const recommendations = top_issues.map(
    (m) => `${m.element} [${m.property}]: ${m.suggestion}`
  );

  return {
    url,
    viewport,
    timestamp: new Date().toISOString(),
    analyses,
    overall_score,
    grade: gradeFromScore(overall_score),
    top_issues,
    top_strengths,
    recommendations,
  };
}

export function formatAnalysisResult(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}

export function formatFullReport(report: FullReport, format: "detailed" | "summary"): string {
  if (format === "summary") {
    return JSON.stringify(
      {
        url: report.url,
        viewport: report.viewport,
        overall_score: report.overall_score,
        grade: report.grade,
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
  return JSON.stringify(report, null, 2);
}
