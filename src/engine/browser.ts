import { chromium, type Browser, type Page } from "playwright-core";
import type { Measurement, AnalysisResult, SectionReport, SpiralOrigin } from "./types.js";
import { captureWithOverlay } from "./overlay.js";
import { gradeFromScore } from "./ratio-calculator.js";
import type { ViewportBounds } from "./extractor.js";

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browser && browser.isConnected()) {
    return browser;
  }
  browser = await chromium.launch({
    headless: process.env.GOLDEN_RATIO_HEADLESS !== "false",
  });
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export interface AnalyzePageResult<T> {
  data: T;
  screenshot: string;
}

export async function analyzePage<T>(
  url: string,
  viewportWidth: number,
  viewportHeight: number,
  extractor: (page: Page) => Promise<T>,
  getMeasurements?: (data: T) => Measurement[]
): Promise<AnalyzePageResult<T>> {
  const b = await getBrowser();
  const page = await b.newPage();
  await page.setViewportSize({ width: viewportWidth, height: viewportHeight });
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  try {
    const data = await extractor(page);
    const measurements = getMeasurements ? getMeasurements(data) : [];
    const screenshot = await captureWithOverlay(page, measurements);
    return { data, screenshot };
  } finally {
    await page.close();
  }
}

export interface SectionAnalysisResult {
  sections: SectionReport[];
  fullPageScreenshot: string;
}

/**
 * Scrolls through the page viewport-by-viewport, running analysis at each
 * scroll position. Returns per-section results with screenshots.
 */
export async function analyzePageSections(
  url: string,
  viewportWidth: number,
  viewportHeight: number,
  sectionExtractor: (page: Page, bounds: ViewportBounds) => Promise<AnalysisResult[]>,
  getMeasurements: (analyses: AnalysisResult[]) => Measurement[],
  spiralOrigin?: SpiralOrigin,
  gradeThresholds?: { A: number; B: number; C: number; D: number }
): Promise<SectionAnalysisResult> {
  const b = await getBrowser();
  const page = await b.newPage();
  await page.setViewportSize({ width: viewportWidth, height: viewportHeight });
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

  try {
    // Get total page height
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const sections: SectionReport[] = [];

    // Calculate scroll positions — each viewport-height is one section
    const scrollPositions: number[] = [];
    for (let y = 0; y < pageHeight; y += viewportHeight) {
      scrollPositions.push(y);
    }

    for (let i = 0; i < scrollPositions.length; i++) {
      const scrollY = scrollPositions[i];
      const bounds: ViewportBounds = {
        scrollY,
        width: viewportWidth,
        height: viewportHeight,
      };

      // Scroll to position before extracting
      await page.evaluate((y) => window.scrollTo(0, y), scrollY);
      await page.waitForTimeout(150);

      const analyses = await sectionExtractor(page, bounds);
      const measurements = getMeasurements(analyses);

      // Capture screenshot at this scroll position with overlay
      const screenshot = await captureWithOverlay(page, measurements, scrollY, spiralOrigin);

      const allMeasurements = analyses.flatMap((a) => a.measurements);
      const totalScore = analyses.length > 0
        ? Math.round(analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length)
        : 0;

      const label = i === 0
        ? "First Contact (viewport)"
        : `Section ${i + 1} (scroll ${i})`;

      const sorted = [...allMeasurements].sort((a, b) => b.deviation_pct - a.deviation_pct);

      sections.push({
        label,
        scroll_y: scrollY,
        viewport: { width: viewportWidth, height: viewportHeight },
        analyses,
        score: totalScore,
        grade: gradeFromScore(totalScore, gradeThresholds),
        top_issues: sorted.filter((m) => !m.pass).slice(0, 5),
        screenshot,
      });
    }

    // Full page screenshot (scroll back to top, no overlay)
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);
    const allMeasurements = sections.flatMap((s) =>
      s.analyses.flatMap((a) => a.measurements)
    );
    const fullPageScreenshot = await captureWithOverlay(page, allMeasurements, undefined, spiralOrigin);

    return { sections, fullPageScreenshot };
  } finally {
    await page.close();
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  await closeBrowser();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await closeBrowser();
  process.exit(0);
});
