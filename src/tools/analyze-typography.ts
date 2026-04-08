import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { analyzePage } from "../engine/browser.js";
import { extractTypographyMeasurements } from "../engine/extractor.js";
import { scoreMeasurements } from "../engine/ratio-calculator.js";
import type { AnalysisResult } from "../engine/types.js";
import { resolveContext } from "../engine/presets.js";

export function registerAnalyzeTypography(server: McpServer) {
  server.tool(
    "analyze_typography",
    "Analyze font size scale for golden ratio progression. " +
    "Set page_type for expanded selectors: blog/portfolio include blockquotes and captions, " +
    "SaaS includes button and label text, e-commerce includes price elements.",
    {
      url: z.string().url().describe("URL of the page to analyze (e.g. http://localhost:3000)"),
      page_type: z.enum(["general", "landing", "saas", "portfolio", "ecommerce", "blog"]).default("general").describe("Page type for context-aware selectors and tolerance"),
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
          (page) => extractTypographyMeasurements(page, selector, ctx.tolerance, undefined, ctx.typographySelectors),
          (m) => m
        );

        for (const m of measurements) m.category = "typography";
        const result: AnalysisResult = {
          category: "typography",
          measurements,
          score: scoreMeasurements(measurements),
          summary: `Analyzed ${measurements.length} typography proportion(s). ${measurements.filter((m) => m.pass).length}/${measurements.length} within golden ratio tolerance.`,
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
              text: JSON.stringify({ error: `Failed to analyze typography: ${(err as Error).message}` }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
