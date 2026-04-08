import { PHI } from "./types.js";
export function calculateRatio(a, b) {
    if (a === 0 && b === 0)
        return 1;
    if (b === 0)
        return Infinity;
    if (a === 0)
        return 0;
    const ratio = a / b;
    return ratio >= 1 ? ratio : 1 / ratio;
}
export function calculateDeviation(ratio, target = PHI) {
    if (target === 0)
        return Infinity;
    return Math.abs((ratio - target) / target) * 100;
}
export function isGoldenRatio(ratio, tolerance = 0.1) {
    const deviation = calculateDeviation(ratio);
    return deviation <= tolerance * 100;
}
export function scoreMeasurements(measurements) {
    if (measurements.length === 0)
        return 100;
    const totalScore = measurements.reduce((sum, m) => {
        // Score each measurement: 100 at 0% deviation, 0 at 50%+ deviation
        const score = Math.max(0, 100 - m.deviation_pct * 2);
        return sum + score;
    }, 0);
    return Math.round(totalScore / measurements.length);
}
export function createMeasurement(element, property, valueA, valueB, tolerance = 0.1) {
    const actual_ratio = calculateRatio(valueA, valueB);
    const deviation_pct = calculateDeviation(actual_ratio);
    const pass = deviation_pct <= tolerance * 100;
    const targetB = Math.round(valueA / PHI);
    const targetA = Math.round(valueB * PHI);
    let suggestion = "";
    if (!pass) {
        const closerToA = Math.abs(valueA - targetA) < Math.abs(valueB - targetB);
        if (closerToA) {
            suggestion = `Adjust to ~${targetB}px (${valueA}px / ${PHI.toFixed(3)}) for golden ratio`;
        }
        else {
            suggestion = `Adjust to ~${targetA}px (${valueB}px × ${PHI.toFixed(3)}) for golden ratio`;
        }
    }
    return {
        element,
        property,
        actual_value_a: Math.round(valueA * 100) / 100,
        actual_value_b: Math.round(valueB * 100) / 100,
        actual_ratio: Math.round(actual_ratio * 1000) / 1000,
        target_ratio: Math.round(PHI * 1000) / 1000,
        deviation_pct: Math.round(deviation_pct * 10) / 10,
        pass,
        suggestion,
    };
}
export function gradeFromScore(score) {
    if (score >= 90)
        return "A";
    if (score >= 80)
        return "B";
    if (score >= 70)
        return "C";
    if (score >= 60)
        return "D";
    return "F";
}
//# sourceMappingURL=ratio-calculator.js.map