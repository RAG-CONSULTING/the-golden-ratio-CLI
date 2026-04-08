import { describe, it, expect } from "vitest";
import {
  calculateRatio,
  calculateDeviation,
  isGoldenRatio,
  scoreMeasurements,
  createMeasurement,
  gradeFromScore,
} from "../../src/engine/ratio-calculator.js";
import { PHI } from "../../src/engine/types.js";

describe("calculateRatio", () => {
  it("returns ratio >= 1 regardless of order", () => {
    expect(calculateRatio(1618, 1000)).toBeCloseTo(1.618, 2);
    expect(calculateRatio(1000, 1618)).toBeCloseTo(1.618, 2);
  });

  it("handles equal values", () => {
    expect(calculateRatio(100, 100)).toBe(1);
  });

  it("handles zero values", () => {
    expect(calculateRatio(0, 0)).toBe(1);
    expect(calculateRatio(100, 0)).toBe(Infinity);
    expect(calculateRatio(0, 100)).toBe(0);
  });
});

describe("calculateDeviation", () => {
  it("returns 0% for exact golden ratio", () => {
    expect(calculateDeviation(PHI)).toBeCloseTo(0, 5);
  });

  it("returns correct deviation percentage", () => {
    // ratio of 2.0 vs PHI (1.618): deviation = (2 - 1.618) / 1.618 * 100 ≈ 23.6%
    expect(calculateDeviation(2.0)).toBeCloseTo(23.6, 0);
  });

  it("returns deviation for ratio of 1", () => {
    // (1.618 - 1) / 1.618 * 100 ≈ 38.2%
    expect(calculateDeviation(1.0)).toBeCloseTo(38.2, 0);
  });
});

describe("isGoldenRatio", () => {
  it("returns true for exact phi", () => {
    expect(isGoldenRatio(PHI)).toBe(true);
  });

  it("returns true within tolerance", () => {
    expect(isGoldenRatio(1.55, 0.1)).toBe(true); // ~4.2% deviation
    expect(isGoldenRatio(1.7, 0.1)).toBe(true); // ~5.1% deviation
  });

  it("returns false outside tolerance", () => {
    expect(isGoldenRatio(2.0, 0.1)).toBe(false);
    expect(isGoldenRatio(1.0, 0.1)).toBe(false);
  });
});

describe("createMeasurement", () => {
  it("creates passing measurement for golden ratio values", () => {
    const m = createMeasurement("div.content", "width/height", 618, 382);
    expect(m.pass).toBe(true);
    expect(m.actual_ratio).toBeCloseTo(1.618, 1);
    expect(m.suggestion).toBe("");
  });

  it("creates failing measurement with suggestion", () => {
    const m = createMeasurement("div.box", "width/height", 500, 500);
    expect(m.pass).toBe(false);
    expect(m.deviation_pct).toBeGreaterThan(10);
    expect(m.suggestion).toContain("1.618");
  });
});

describe("scoreMeasurements", () => {
  it("returns 100 for empty array", () => {
    expect(scoreMeasurements([])).toBe(100);
  });

  it("returns high score for golden ratio measurements", () => {
    const m = createMeasurement("el", "prop", 618, 382);
    expect(scoreMeasurements([m])).toBeGreaterThan(90);
  });

  it("returns low score for non-golden measurements", () => {
    const m = createMeasurement("el", "prop", 500, 500);
    expect(scoreMeasurements([m])).toBeLessThan(30);
  });
});

describe("gradeFromScore", () => {
  it("returns correct grades", () => {
    expect(gradeFromScore(95)).toBe("A");
    expect(gradeFromScore(85)).toBe("B");
    expect(gradeFromScore(75)).toBe("C");
    expect(gradeFromScore(65)).toBe("D");
    expect(gradeFromScore(50)).toBe("F");
  });
});
