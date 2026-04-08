import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { analyzePage } from "../engine/browser.js";
import { extractSpacingMeasurements } from "../engine/extractor.js";
import { scoreMeasurements } from "../engine/ratio-calculator.js";
import type { AnalysisResult } from "../engine/types.js";
import { resolveContext } from "../engine/presets.js";

export function registerAnalyzeSpacing(server: McpServer) {
  server.tool(
    "analyze_spacing",
    "Analyze margin and padding relationships for golden ratio harmony. " +
    "Set page_type to adjust scan depth: e-commerce scans up to 120 children (for product grids), " +
    "SaaS includes card, nav, and form elements. General scans 30 children.",
    {
      url: z.string().url().describe("URL of the page to analyze (e.g. http://localhost:3000)"),
      page_type: z.enum(["general", "landing", "saas", "portfolio", "ecommerce", "blog"]).default("general").describe("Page type for context-aware scan depth and tolerance"),
      selector: z.string().default("body").describe("CSS selector to scope analysis. Defaults to 'body'"),
      tolerance: z.number().min(0.01).max(0.5).optional().describe("Override tolerance. Uses preset default if omitted"),
      viewport_width: z.number().int().min(320).max(3840).default(1440).describe("Viewport width in pixels"),
      viewport_height: z.number().int().min(480).max(2160).default(900).describe("Viewport height in pixels"),
    },
    async ({ url, page_type, selector, tolerance, viewport_width, viewport_height }) => {
      const ctx = resolveContext(page_type, { tolerance });
      try {
        const { data: measurements, screenshot } = await analyzePage(
          url,
          viewport_width,
          viewport_height,
          (page) => extractSpacingMeasurements(page, selector, ctx.tolerance, undefined, ctx.spacingChildLimit),
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
