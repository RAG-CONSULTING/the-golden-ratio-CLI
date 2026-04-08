import { z } from "zod";
import { analyzePageSections } from "../engine/browser.js";
import { extractLayoutMeasurements, extractTypographyMeasurements, extractSpacingMeasurements, } from "../engine/extractor.js";
import { scoreMeasurements } from "../engine/ratio-calculator.js";
import { buildFullReport, formatFullReport } from "../utils/formatting.js";
function stampCategory(measurements, category) {
    for (const m of measurements)
        m.category = category;
}
function buildAnalyses(layoutMeasurements, typographyMeasurements, spacingMeasurements) {
    stampCategory(layoutMeasurements, "layout");
    stampCategory(typographyMeasurements, "typography");
    stampCategory(spacingMeasurements, "spacing");
    return [
        {
            category: "layout",
            measurements: layoutMeasurements,
            score: scoreMeasurements(layoutMeasurements),
            summary: `${layoutMeasurements.filter((m) => m.pass).length}/${layoutMeasurements.length} layout proportions within tolerance`,
        },
        {
            category: "typography",
            measurements: typographyMeasurements,
            score: scoreMeasurements(typographyMeasurements),
            summary: `${typographyMeasurements.filter((m) => m.pass).length}/${typographyMeasurements.length} typography proportions within tolerance`,
        },
        {
            category: "spacing",
            measurements: spacingMeasurements,
            score: scoreMeasurements(spacingMeasurements),
            summary: `${spacingMeasurements.filter((m) => m.pass).length}/${spacingMeasurements.length} spacing proportions within tolerance`,
        },
    ];
}
export function registerGenerateReport(server) {
    server.tool("generate_report", "Run all golden ratio analyses by scrolling through the page section-by-section. Produces a scored report for each viewport frame, highlighting the 'first contact' (above-the-fold) view separately. Each section gets its own annotated screenshot and grade (A-F).", {
        url: z.string().url().describe("URL of the page to analyze (e.g. http://localhost:3000)"),
        viewport_width: z.number().int().min(320).max(3840).default(1440).describe("Viewport width in pixels"),
        viewport_height: z.number().int().min(480).max(2160).default(900).describe("Viewport height in pixels"),
        tolerance: z.number().min(0.01).max(0.5).default(0.1).describe("Acceptable deviation from phi. Default 0.10 = 10%"),
        format: z.enum(["detailed", "summary"]).default("detailed").describe("'detailed' includes every measurement; 'summary' shows only scores and top issues"),
    }, async ({ url, viewport_width, viewport_height, tolerance, format }) => {
        try {
            const { sections, fullPageScreenshot } = await analyzePageSections(url, viewport_width, viewport_height, async (page, bounds) => {
                const [layoutMeasurements, typographyMeasurements, spacingMeasurements] = await Promise.all([
                    extractLayoutMeasurements(page, tolerance, bounds),
                    extractTypographyMeasurements(page, "body", tolerance, bounds),
                    extractSpacingMeasurements(page, "body", tolerance, bounds),
                ]);
                return buildAnalyses(layoutMeasurements, typographyMeasurements, spacingMeasurements);
            }, (analyses) => analyses.flatMap((a) => a.measurements));
            // Combine all section analyses for the overall report
            const allAnalyses = sections.flatMap((s) => s.analyses);
            // Merge measurements by category across sections
            const mergedAnalyses = [];
            const categories = ["layout", "typography", "spacing"];
            for (const cat of categories) {
                const catAnalyses = allAnalyses.filter((a) => a.category === cat);
                const allMeasurements = catAnalyses.flatMap((a) => a.measurements);
                if (allMeasurements.length > 0) {
                    mergedAnalyses.push({
                        category: cat,
                        measurements: allMeasurements,
                        score: scoreMeasurements(allMeasurements),
                        summary: `${allMeasurements.filter((m) => m.pass).length}/${allMeasurements.length} ${cat} proportions within tolerance`,
                    });
                }
            }
            const report = buildFullReport(url, { width: viewport_width, height: viewport_height }, mergedAnalyses, sections);
            const text = formatFullReport(report, format);
            const content = [];
            // Full page overview
            content.push({ type: "image", data: fullPageScreenshot, mimeType: "image/png" });
            // Per-section screenshots
            for (const section of sections) {
                if (section.screenshot) {
                    content.push({
                        type: "text",
                        text: `--- ${section.label}: ${section.grade} (score: ${section.score}) ---`,
                    });
                    content.push({ type: "image", data: section.screenshot, mimeType: "image/png" });
                }
            }
            content.push({ type: "text", text });
            return { content };
        }
        catch (err) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({ error: `Failed to generate report: ${err.message}` }, null, 2),
                    },
                ],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=generate-report.js.map