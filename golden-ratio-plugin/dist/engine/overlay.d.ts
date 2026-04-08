import type { Page } from "playwright-core";
import type { Measurement } from "./types.js";
/**
 * Injects golden ratio visual overlays onto the page and takes a screenshot.
 * Draws pass/fail boxes, dimension line annotations showing what's being measured,
 * and ratio tags showing the calculation.
 * When scrollY is provided, scrolls to that position and captures only the viewport.
 * Returns the screenshot as a base64-encoded PNG.
 */
export declare function captureWithOverlay(page: Page, measurements: Measurement[], scrollY?: number): Promise<string>;
//# sourceMappingURL=overlay.d.ts.map