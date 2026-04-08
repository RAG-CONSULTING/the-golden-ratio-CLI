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
  category?: "layout" | "typography" | "spacing" | "element" | "density" | "noise";
}

export interface AnalysisResult {
  category: "layout" | "typography" | "spacing" | "element" | "density" | "noise";
  measurements: Measurement[];
  score: number;
  summary: string;
}

export interface SectionReport {
  label: string;
  scroll_y: number;
  viewport: { width: number; height: number };
  analyses: AnalysisResult[];
  score: number;
  grade: string;
  top_issues: Measurement[];
  screenshot?: string;
}

export interface FullReport {
  url: string;
  viewport: { width: number; height: number };
  timestamp: string;
  page_type?: PageType;
  first_contact: SectionReport;
  sections: SectionReport[];
  analyses: AnalysisResult[];
  overall_score: number;
  grade: string;
  top_issues: Measurement[];
  top_strengths: Measurement[];
  recommendations: string[];
}

// --- Context-Aware Analysis Types ---

export type PageType = "general" | "landing" | "saas" | "portfolio" | "ecommerce" | "blog";

export type SpiralOrigin = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface CategoryWeights {
  layout: number;
  typography: number;
  spacing: number;
  element: number;
  density: number;
  noise: number;
}

export interface PageContext {
  pageType: PageType;
  weights: CategoryWeights;
  tolerance: number;
  typographySelectors: string[];
  spacingChildLimit: number;
  spiralOrigin: SpiralOrigin;
  gradeThresholds: { A: number; B: number; C: number; D: number };
}
