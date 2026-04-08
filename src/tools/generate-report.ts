import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { analyzePage } from "../engine/browser.js";
import {
  extractLayoutMeasurements,
  extractTypographyMeasurements,
  extractSpacingMeasurements,
} from "../engine/extractor.js";
import { scoreMeasurements } from "../engine/ratio-calculator.js";
import type { AnalysisResult } from "../engine/types.js";
import { buildFullReport, formatFullReport } from "../utils/formatting.js";

export function registerGenerateReport(server: McpServer) {
  server.tool(
    "generate_report",
    "Run all golden ratio analyses and produce a comprehensive scored report. Combines layout, typography, and spacing analysis into an overall grade (A-F).",
    {
      url: z.string().url().describe("URL of the page to analyze (e.g. http://localhost:3000)"),
      viewport_width: z.number().int().min(320).max(3840).default(1440).describe("Viewport width in pixels"),
      viewport_height: z.number().int().min(480).max(2160).default(900).describe("Viewport height in pixels"),
      tolerance: z.number().min(0.01).max(0.5).default(0.1).describe("Acceptable deviation from phi. Default 0.10 = 10%"),
      format: z.enum(["detailed", "summary"]).default("detailed").describe("'detailed' includes every measurement; 'summary' shows only scores and top issues"),
    },
    async ({ url, viewport_width, viewport_height, tolerance, format }) => {
      try {
        const analyses: AnalysisResult[] = await analyzePage(
          url,
          viewport_width,
          viewport_height,
          async (page) => {
            const [layoutMeasurements, typographyMeasurements, spacingMeasurements] =
              await Promise.all([
                extractLayoutMeasurements(page, tolerance),
                extractTypographyMeasurements(page, "body", tolerance),
                extractSpacingMeasurements(page, "body", tolerance),
              ]);

            return [
              {
                category: "layout" as const,
                measurements: layoutMeasurements,
                score: scoreMeasurements(layoutMeasurements),
                summary: `${layoutMeasurements.filter((m) => m.pass).length}/${layoutMeasurements.length} layout proportions within tolerance`,
              },
              {
                category: "typography" as const,
                measurements: typographyMeasurements,
                score: scoreMeasurements(typographyMeasurements),
                summary: `${typographyMeasurements.filter((m) => m.pass).length}/${typographyMeasurements.length} typography proportions within tolerance`,
              },
              {
                category: "spacing" as const,
                measurements: spacingMeasurements,
                score: scoreMeasurements(spacingMeasurements),
                summary: `${spacingMeasurements.filter((m) => m.pass).length}/${spacingMeasurements.length} spacing proportions within tolerance`,
              },
            ];
          }
        );

        const report = buildFullReport(url, { width: viewport_width, height: viewport_height }, analyses);
        const text = formatFullReport(report, format);

        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: `Failed to generate report: ${(err as Error).message}` }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
