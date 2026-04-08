import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { analyzePage } from "../engine/browser.js";
import { extractLayoutMeasurements } from "../engine/extractor.js";
import { scoreMeasurements } from "../engine/ratio-calculator.js";
import type { AnalysisResult } from "../engine/types.js";

export function registerAnalyzeLayout(server: McpServer) {
  server.tool(
    "analyze_layout",
    "Analyze full page layout for golden ratio proportions. Checks content/sidebar width ratios, section height ratios, and major element dimensions.",
    {
      url: z.string().url().describe("URL of the page to analyze (e.g. http://localhost:3000)"),
      viewport_width: z.number().int().min(320).max(3840).default(1440).describe("Viewport width in pixels"),
      viewport_height: z.number().int().min(480).max(2160).default(900).describe("Viewport height in pixels"),
      tolerance: z.number().min(0.01).max(0.5).default(0.1).describe("Acceptable deviation from phi. Default 0.10 = 10%"),
    },
    async ({ url, viewport_width, viewport_height, tolerance }) => {
      try {
        const measurements = await analyzePage(url, viewport_width, viewport_height, (page) =>
          extractLayoutMeasurements(page, tolerance)
        );

        const result: AnalysisResult = {
          category: "layout",
          measurements,
          score: scoreMeasurements(measurements),
          summary: `Analyzed ${measurements.length} layout proportion(s). ${measurements.filter((m) => m.pass).length}/${measurements.length} within golden ratio tolerance.`,
        };

        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: `Failed to analyze layout: ${(err as Error).message}` }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
