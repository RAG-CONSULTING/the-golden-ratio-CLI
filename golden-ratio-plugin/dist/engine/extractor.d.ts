import type { Page } from "playwright";
import type { Measurement } from "./types.js";
/** Viewport bounds for filtering elements to a scroll section */
export interface ViewportBounds {
    scrollY: number;
    width: number;
    height: number;
}
export declare function extractLayoutMeasurements(page: Page, tolerance: number, bounds?: ViewportBounds): Promise<Measurement[]>;
export declare function extractTypographyMeasurements(page: Page, scopeSelector: string, tolerance: number, bounds?: ViewportBounds): Promise<Measurement[]>;
export declare function extractSpacingMeasurements(page: Page, scopeSelector: string, tolerance: number, bounds?: ViewportBounds): Promise<Measurement[]>;
export declare function extractElementMeasurements(page: Page, selector: string, includeChildren: boolean, tolerance: number): Promise<Measurement[]>;
//# sourceMappingURL=extractor.d.ts.map