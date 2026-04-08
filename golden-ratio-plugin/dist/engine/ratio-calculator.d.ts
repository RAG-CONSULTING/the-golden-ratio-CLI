import { type Measurement } from "./types.js";
export declare function calculateRatio(a: number, b: number): number;
export declare function calculateDeviation(ratio: number, target?: number): number;
export declare function isGoldenRatio(ratio: number, tolerance?: number): boolean;
export declare function scoreMeasurements(measurements: Measurement[]): number;
export declare function createMeasurement(element: string, property: string, valueA: number, valueB: number, tolerance?: number): Measurement;
export declare function gradeFromScore(score: number): string;
//# sourceMappingURL=ratio-calculator.d.ts.map