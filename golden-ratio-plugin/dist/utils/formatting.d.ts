import type { AnalysisResult, FullReport, SectionReport } from "../engine/types.js";
export declare function buildFullReport(url: string, viewport: {
    width: number;
    height: number;
}, analyses: AnalysisResult[], sections?: SectionReport[]): FullReport;
export declare function formatAnalysisResult(result: AnalysisResult): string;
export declare function formatFullReport(report: FullReport, format: "detailed" | "summary"): string;
//# sourceMappingURL=formatting.d.ts.map