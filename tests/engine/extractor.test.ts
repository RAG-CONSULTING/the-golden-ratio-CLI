import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractLayoutMeasurements,
  extractTypographyMeasurements,
  extractSpacingMeasurements,
  extractElementMeasurements,
} from "../../src/engine/extractor.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(__dirname, "../fixtures/test-page.html");

let browser: Browser;
let page: Page;
let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  // Serve the fixture file
  const html = fs.readFileSync(fixturePath, "utf-8");
  server = http.createServer((_, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const addr = server.address();
  if (addr && typeof addr === "object") {
    baseUrl = `http://127.0.0.1:${addr.port}`;
  }

  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
}, 30000);

afterAll(async () => {
  await page?.close();
  await browser?.close();
  server?.close();
});

describe("extractLayoutMeasurements", () => {
  it("detects layout proportions", async () => {
    const measurements = await extractLayoutMeasurements(page, 0.1);
    expect(measurements.length).toBeGreaterThan(0);

    // Should find width/height ratios for major sections
    const widthHeight = measurements.filter((m) => m.property === "width/height ratio");
    expect(widthHeight.length).toBeGreaterThan(0);
  });
});

describe("extractTypographyMeasurements", () => {
  it("detects font size ratios between headings", async () => {
    const measurements = await extractTypographyMeasurements(page, "body", 0.1);
    expect(measurements.length).toBeGreaterThan(0);

    const fontRatios = measurements.filter((m) => m.property === "font-size ratio");
    expect(fontRatios.length).toBeGreaterThan(0);

    // h1/h2 ratio should be close to golden ratio (68/42 ≈ 1.619)
    const h1h2 = fontRatios.find((m) => m.element === "h1 / h2");
    if (h1h2) {
      expect(h1h2.actual_ratio).toBeCloseTo(1.618, 1);
      expect(h1h2.pass).toBe(true);
    }
  });

  it("checks line-height/font-size ratios", async () => {
    const measurements = await extractTypographyMeasurements(page, "body", 0.1);
    const lineHeightRatios = measurements.filter((m) => m.property === "line-height/font-size ratio");
    expect(lineHeightRatios.length).toBeGreaterThan(0);

    // p has font-size: 16px, line-height: 26px → ratio 1.625 ≈ phi
    const pRatio = lineHeightRatios.find((m) => m.element === "p");
    if (pRatio) {
      expect(pRatio.actual_ratio).toBeCloseTo(1.618, 1);
      expect(pRatio.pass).toBe(true);
    }
  });
});

describe("extractSpacingMeasurements", () => {
  it("extracts spacing data", async () => {
    const measurements = await extractSpacingMeasurements(page, "body", 0.1);
    // May or may not find spacing depending on computed styles
    expect(measurements).toBeDefined();
    expect(Array.isArray(measurements)).toBe(true);
  });
});

describe("extractElementMeasurements", () => {
  it("analyzes golden-ratio card proportions", async () => {
    const measurements = await extractElementMeasurements(page, ".golden-card", false, 0.1);
    expect(measurements.length).toBeGreaterThan(0);

    const whRatio = measurements.find((m) => m.property === "width/height ratio");
    expect(whRatio).toBeDefined();
    if (whRatio) {
      expect(whRatio.actual_ratio).toBeCloseTo(1.618, 1);
      expect(whRatio.pass).toBe(true);
    }
  });

  it("detects non-golden square card", async () => {
    const measurements = await extractElementMeasurements(page, ".square-card", false, 0.1);
    const whRatio = measurements.find((m) => m.property === "width/height ratio");
    expect(whRatio).toBeDefined();
    if (whRatio) {
      expect(whRatio.actual_ratio).toBeCloseTo(1.0, 1);
      expect(whRatio.pass).toBe(false);
    }
  });

  it("returns empty for non-existent selector", async () => {
    const measurements = await extractElementMeasurements(page, ".does-not-exist", false, 0.1);
    expect(measurements).toHaveLength(0);
  });

  it("includes children when requested", async () => {
    const measurements = await extractElementMeasurements(page, ".content", true, 0.1);
    const childMeasurements = measurements.filter((m) => m.property === "child/parent width ratio");
    expect(childMeasurements.length).toBeGreaterThan(0);
  });
});
