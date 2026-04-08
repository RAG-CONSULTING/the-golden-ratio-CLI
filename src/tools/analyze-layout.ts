import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { analyzePage } from "../engine/browser.js";
import { extractLayoutMeasurements } from "../engine/extractor.js";
import { scoreMeasurements } from "../engine/ratio-calculator.js";
import type { AnalysisResult } from "../engine/types.js";
import { resolveContext } from "../engine/presets.js";

export function registerAnalyzeLayout(server: McpServer) {
  server.tool(
    "analyze_layout",
    "Analyze page layout for golden ratio proportions. Checks content/sidebar splits, section heights, element dimensions. " +
    "Set page_type for context-aware analysis: landing pages emphasize hero proportions, SaaS checks sidebar/content splits.",
    {
      url: z.string().url().describe("URL of the page to analyze (e.g. http://localhost:3000)"),
      page_type: z.enum(["general", "landing", "saas", "portfolio", "ecommerce", "blog"]).default("general").describe("Page type for context-aware tolerance"),
      viewport_width: z.number().int().min(320).max(3840).default(1440).describe("Viewport width in pixels"),
      viewport_height: z.number().int().min(480).max(2160).default(900).describe("Viewport height in pixels"),
      tolerance: z.number().min(0.01).max(0.5).optional().describe("Override tolerance. Uses preset default if omitted"),
    },
    async ({ url, page_type, viewport_width, viewport_height, tolerance }) => {
      const ctx = resolveContext(page_type, { tolerance });
      try {
        const { data: measurements, screenshot } = await analyzePage(
          url,
          viewport_width,
          viewport_height,
          (page) => extractLayoutMeasurements(page, ctx.tolerance),
          (m) => m
        );

        for (const m of measurements) m.category = "layout";
        const result: AnalysisResult = {
          category: "layout",
          measurements,
          score: scoreMeasurements(measurements),
          summary: `Analyzed ${measurements.length} layout proportion(s). ${measurements.filter((m) => m.pass).length}/${measurements.length} within golden ratio tolerance.`,
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
              text: JSON.stringify({ error: `Failed to analyze layout: ${(err as Error).message}` }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
