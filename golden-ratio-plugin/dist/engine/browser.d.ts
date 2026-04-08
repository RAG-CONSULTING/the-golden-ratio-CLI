import { type Browser, type Page } from "playwright-core";
import type { Measurement, AnalysisResult, SectionReport } from "./types.js";
import type { ViewportBounds } from "./extractor.js";
export declare function getBrowser(): Promise<Browser>;
export declare function closeBrowser(): Promise<void>;
export interface AnalyzePageResult<T> {
    data: T;
    screenshot: string;
}
export declare function analyzePage<T>(url: string, viewportWidth: number, viewportHeight: number, extractor: (page: Page) => Promise<T>, getMeasurements?: (data: T) => Measurement[]): Promise<AnalyzePageResult<T>>;
export interface SectionAnalysisResult {
    sections: SectionReport[];
    fullPageScreenshot: string;
}
/**
 * Scrolls through the page viewport-by-viewport, running analysis at each
 * scroll position. Returns per-section results with screenshots.
 */
export declare function analyzePageSections(url: string, viewportWidth: number, viewportHeight: number, sectionExtractor: (page: Page, bounds: ViewportBounds) => Promise<AnalysisResult[]>, getMeasurements: (analyses: AnalysisResult[]) => Measurement[]): Promise<SectionAnalysisResult>;
//# sourceMappingURL=browser.d.ts.map