import { z } from "zod";
import { analyzePage } from "../engine/browser.js";
import { extractElementMeasurements } from "../engine/extractor.js";
import { scoreMeasurements } from "../engine/ratio-calculator.js";
export function registerAnalyzeElement(server) {
    server.tool("analyze_element", "Analyze a specific element's proportions against the golden ratio. Checks width/height ratio, padding proportions, and relationship to parent container. Returns an annotated screenshot with visual overlays.", {
        url: z.string().url().describe("URL of the page to analyze (e.g. http://localhost:3000)"),
        selector: z.string().describe("CSS selector for the element (e.g. '.hero-card', '#main-modal')"),
        include_children: z.boolean().default(false).describe("Also analyze direct children's proportions relative to the element"),
        tolerance: z.number().min(0.01).max(0.5).default(0.1).describe("Acceptable deviation from phi. Default 0.10 = 10%"),
        viewport_width: z.number().int().min(320).max(3840).default(1440).describe("Viewport width in pixels"),
        viewport_height: z.number().int().min(480).max(2160).default(900).describe("Viewport height in pixels"),
    }, async ({ url, selector, include_children, tolerance, viewport_width, viewport_height }) => {
        try {
            const { data: measurements, screenshot } = await analyzePage(url, viewport_width, viewport_height, (page) => extractElementMeasurements(page, selector, include_children, tolerance), (m) => m);
            if (measurements.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ error: `No element found matching selector "${selector}" or element has no measurable dimensions` }, null, 2),
                        },
                    ],
                };
            }
            for (const m of measurements)
                m.category = "element";
            const result = {
                category: "element",
                measurements,
                score: scoreMeasurements(measurements),
                summary: `Analyzed ${measurements.length} proportion(s) for "${selector}". ${measurements.filter((m) => m.pass).length}/${measurements.length} within golden ratio tolerance.`,
            };
            return {
                content: [
                    { type: "image", data: screenshot, mimeType: "image/png" },
                    { type: "text", text: JSON.stringify(result, null, 2) },
                ],
            };
        }
        catch (err) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({ error: `Failed to analyze element: ${err.message}` }, null, 2),
                    },
                ],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=analyze-element.js.map