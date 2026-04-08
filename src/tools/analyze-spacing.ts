import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { analyzePage } from "../engine/browser.js";
import { extractSpacingMeasurements } from "../engine/extractor.js";
import { scoreMeasurements } from "../engine/ratio-calculator.js";
import type { AnalysisResult } from "../engine/types.js";

export function registerAnalyzeSpacing(server: McpServer) {
  server.tool(
    "analyze_spacing",
    "Analyze margin and padding relationships for golden ratio harmony. Checks spacing ratios between related elements like sections, cards, and form groups. Returns an annotated screenshot with visual overlays.",
    {
      url: z.string().url().describe("URL of the page to analyze (e.g. http://localhost:3000)"),
      selector: z.string().default("body").describe("CSS selector to scope analysis. Defaults to 'body'"),
      tolerance: z.number().min(0.01).max(0.5).default(0.1).describe("Acceptable deviation from phi. Default 0.10 = 10%"),
      viewport_width: z.number().int().min(320).max(3840).default(1440).describe("Viewport width in pixels"),
      viewport_height: z.number().int().min(480).max(2160).default(900).describe("Viewport height in pixels"),
    },
    async ({ url, selector, tolerance, viewport_width, viewport_height }) => {
      try {
        const { data: measurements, screenshot } = await analyzePage(
          url,
          viewport_width,
          viewport_height,
          (page) => extractSpacingMeasurements(page, selector, tolerance),
          (m) => m
        );

        for (const m of measurements) m.category = "spacing";
        const result: AnalysisResult = {
          category: "spacing",
          measurements,
          score: scoreMeasurements(measurements),
          summary: `Analyzed ${measurements.length} spacing proportion(s). ${measurements.filter((m) => m.pass).length}/${measurements.length} within golden ratio tolerance.`,
        };

        return {
          content: [
            { type: "image" as const, data: screenshot, mimeType: "image/png" },
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: `Failed to analyze spacing: ${(err as Error).message}` }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
