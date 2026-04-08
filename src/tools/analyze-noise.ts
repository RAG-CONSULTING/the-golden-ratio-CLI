import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { analyzePage } from "../engine/browser.js";
import { extractNoiseMeasurements } from "../engine/extractor.js";
import { scoreMeasurements } from "../engine/ratio-calculator.js";
import type { AnalysisResult } from "../engine/types.js";
import { resolveContext } from "../engine/presets.js";

export function registerAnalyzeNoise(server: McpServer) {
  server.tool(
    "analyze_noise",
    "Analyze visual noise and clutter — element size variance, color complexity, spatial clustering, and small element ratio. " +
    "Checks if the visual hierarchy follows golden ratio proportions between dominant and secondary elements.",
    {
      url: z.string().url().describe("URL of the page to analyze"),
      page_type: z.enum(["general", "landing", "saas", "portfolio", "ecommerce", "blog"]).default("general").describe("Page type for context-aware tolerance"),
      viewport_width: z.number().int().min(320).max(3840).default(1440).describe("Viewport width in pixels"),
      viewport_height: z.number().int().min(480).max(2160).default(900).describe("Viewport height in pixels"),
      tolerance: z.number().min(0.01).max(0.5).optional().describe("Override tolerance"),
    },
    async ({ url, page_type, viewport_width, viewport_height, tolerance }) => {
      const ctx = resolveContext(page_type, { tolerance });
      try {
        const { data: measurements, screenshot } = await analyzePage(
          url, viewport_width, viewport_height,
          (page) => extractNoiseMeasurements(page, ctx.tolerance),
          (m) => m
        );

        for (const m of measurements) m.category = "noise";
        const result: AnalysisResult = {
          category: "noise",
          measurements,
          score: scoreMeasurements(measurements),
          summary: `Analyzed ${measurements.length} noise proportion(s). ${measurements.filter((m) => m.pass).length}/${measurements.length} within golden ratio tolerance.`,
        };

        return {
          content: [
            { type: "image" as const, data: screenshot, mimeType: "image/png" },
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Failed to analyze noise: ${(err as Error).message}` }, null, 2) }],
          isError: true,
        };
      }
    }
  );
}
