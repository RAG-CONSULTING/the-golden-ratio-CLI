export const PHI = 1.6180339887;
export const PHI_INVERSE = 0.6180339887;

export interface Measurement {
  element: string;
  property: string;
  actual_value_a: number;
  actual_value_b: number;
  actual_ratio: number;
  target_ratio: number;
  deviation_pct: number;
  pass: boolean;
  suggestion: string;
}

export interface AnalysisResult {
  category: "layout" | "typography" | "spacing" | "element";
  measurements: Measurement[];
  score: number;
  summary: string;
}

export interface FullReport {
  url: string;
  viewport: { width: number; height: number };
  timestamp: string;
  analyses: AnalysisResult[];
  overall_score: number;
  grade: string;
  top_issues: Measurement[];
  top_strengths: Measurement[];
  recommendations: string[];
}
