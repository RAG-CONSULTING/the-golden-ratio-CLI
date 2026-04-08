#!/usr/bin/env node

import { analyzePageSections } from "../dist/engine/browser.js";
import {
  extractLayoutMeasurements,
  extractTypographyMeasurements,
  extractSpacingMeasurements,
} from "../dist/engine/extractor.js";
import { scoreMeasurements } from "../dist/engine/ratio-calculator.js";
import { buildFullReport, formatFullReport } from "../dist/utils/formatting.js";
import { closeBrowser } from "../dist/engine/browser.js";
import { writeFileSync } from "node:fs";

const url = process.argv[2] || "https://jongibby.com/";
const tolerance = 0.1;
const width = 1440;
const height = 900;

const { sections, fullPageScreenshot } = await analyzePageSections(
  url,
  width,
  height,
  async (page, bounds) => {
    const [layoutM, typoM, spacingM] = await Promise.all([
      extractLayoutMeasurements(page, tolerance, bounds),
      extractTypographyMeasurements(page, "body", tolerance, bounds),
      extractSpacingMeasurements(page, "body", tolerance, bounds),
    ]);
    for (const m of layoutM) m.category = "layout";
    for (const m of typoM) m.category = "typography";
    for (const m of spacingM) m.category = "spacing";
    return [
      { category: "layout", measurements: layoutM, score: scoreMeasurements(layoutM), summary: `${layoutM.filter(m => m.pass).length}/${layoutM.length} layout proportions within tolerance` },
      { category: "typography", measurements: typoM, score: scoreMeasurements(typoM), summary: `${typoM.filter(m => m.pass).length}/${typoM.length} typography proportions within tolerance` },
      { category: "spacing", measurements: spacingM, score: scoreMeasurements(spacingM), summary: `${spacingM.filter(m => m.pass).length}/${spacingM.length} spacing proportions within tolerance` },
    ];
  },
  (analyses) => analyses.flatMap((a) => a.measurements)
);

await closeBrowser();

// Save full page screenshot
writeFileSync("golden-ratio-report.png", Buffer.from(fullPageScreenshot, "base64"));
console.log("Full page screenshot saved to: golden-ratio-report.png");

// Save per-section screenshots
for (let i = 0; i < sections.length; i++) {
  const section = sections[i];
  if (section.screenshot) {
    const filename = `golden-ratio-section-${i}.png`;
    writeFileSync(filename, Buffer.from(section.screenshot, "base64"));
    console.log(`${section.label} screenshot saved to: ${filename}`);
  }
}

// Merge analyses across sections for overall report
const allAnalyses = sections.flatMap((s) => s.analyses);
const categories = ["layout", "typography", "spacing"];
const mergedAnalyses = categories.map((cat) => {
  const measurements = allAnalyses.filter((a) => a.category === cat).flatMap((a) => a.measurements);
  return {
    category: cat,
    measurements,
    score: scoreMeasurements(measurements),
    summary: `${measurements.filter((m) => m.pass).length}/${measurements.length} ${cat} proportions within tolerance`,
  };
}).filter((a) => a.measurements.length > 0);

const report = buildFullReport(url, { width, height }, mergedAnalyses, sections);
console.log(formatFullReport(report, "summary"));
