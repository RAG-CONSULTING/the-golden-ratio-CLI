import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { analyzePageSections } from "../engine/browser.js";
import {
  extractLayoutMeasurements,
  extractTypographyMeasurements,
  extractSpacingMeasurements,
  extractDensityMeasurements,
  extractNoiseMeasurements,
  type ViewportBounds,
} from "../engine/extractor.js";
import { scoreMeasurements } from "../engine/ratio-calculator.js";
import type { AnalysisResult, Measurement } from "../engine/types.js";
import { resolveContext } from "../engine/presets.js";
import { buildFullReport, formatFullReport } from "../utils/formatting.js";

function stampCategory(measurements: Measurement[], category: Measurement["category"]): void {
  for (const m of measurements) m.category = category;
}

function buildAnalyses(
  layoutM: Measurement[],
  typographyM: Measurement[],
  spacingM: Measurement[],
  densityM: Measurement[],
  noiseM: Measurement[]
): AnalysisResult[] {
  stampCategory(layoutM, "layout");
  stampCategory(typographyM, "typography");
  stampCategory(spacingM, "spacing");
  stampCategory(densityM, "density");
  stampCategory(noiseM, "noise");

  function makeResult(category: AnalysisResult["category"], measurements: Measurement[]): AnalysisResult {
    return {
      category,
      measurements,
      score: scoreMeasurements(measurements),
      summary: `${measurements.filter((m) => m.pass).length}/${measurements.length} ${category} proportions within tolerance`,
    };
  }

  return [
    makeResult("layout", layoutM),
    makeResult("typography", typographyM),
    makeResult("spacing", spacingM),
    makeResult("density", densityM),
    makeResult("noise", noiseM),
  ];
}

export function registerGenerateReport(server: McpServer) {
  server.tool(
    "generate_report",
    "Context-aware golden ratio analysis. Scrolls the page section-by-section, scoring each viewport frame. " +
    "BEFORE CALLING: Ask the user what type of page this is (landing, saas, portfolio, ecommerce, blog) " +
    "and where the visual focal point should be. Set page_type to adapt category weights, element selectors, " +
    "tolerances, and spiral orientation to the page's purpose. Each section gets its own annotated screenshot and grade.",
    {
      url: z.string().url().describe("URL of the page to analyze (e.g. http://localhost:3000)"),
      page_type: z.enum(["general", "landing", "saas", "portfolio", "ecommerce", "blog"]).default("general").describe(
        "Type of page being analyzed. Determines how categories are weighted, which elements are scanned, and how the golden spiral is oriented. " +
        "ASK THE USER what type of page this is before running analysis. " +
        "landing = hero/CTA focus (layout 40%, typography 30%). " +
        "saas = dashboard/app (spacing 35%, scans buttons/labels). " +
        "portfolio = creative work (typography 45%, stricter grading). " +
        "ecommerce = product pages (spacing 40%, scans 120+ children). " +
        "blog = reading experience (typography 50%, stricter grading)."
      ),
      viewport_width: z.number().int().min(320).max(3840).default(1440).describe("Viewport width in pixels"),
      viewport_height: z.number().int().min(480).max(2160).default(900).describe("Viewport height in pixels"),
      tolerance: z.number().min(0.01).max(0.5).optional().describe("Override tolerance. If omitted, uses the preset's default (8-12% depending on page_type)"),
      format: z.enum(["detailed", "summary"]).default("detailed").describe("'detailed' includes every measurement; 'summary' shows only scores and top issues"),
      spiral_origin: z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]).optional().describe(
        "Override where the golden spiral converges. Ask the user where the visual focal point is. " +
        "Defaults to preset recommendation (e.g. top-right for landing pages, top-left for SaaS)."
      ),
    },
    async ({ url, page_type, viewport_width, viewport_height, tolerance, format, spiral_origin }) => {
      try {
        const ctx = resolveContext(page_type, {
          tolerance,
          spiralOrigin: spiral_origin,
        });

        const { sections, fullPageScreenshot } = await analyzePageSections(
          url,
          viewport_width,
          viewport_height,
          async (page, bounds: ViewportBounds) => {
            const [layoutM, typographyM, spacingM, densityM, noiseM] =
              await Promise.all([
                extractLayoutMeasurements(page, ctx.tolerance, bounds),
                extractTypographyMeasurements(page, "body", ctx.tolerance, bounds, ctx.typographySelectors),
                extractSpacingMeasurements(page, "body", ctx.tolerance, bounds, ctx.spacingChildLimit),
                extractDensityMeasurements(page, ctx.tolerance, bounds),
                extractNoiseMeasurements(page, ctx.tolerance, bounds),
              ]);

            return buildAnalyses(layoutM, typographyM, spacingM, densityM, noiseM);
          },
          (analyses) => analyses.flatMap((a) => a.measurements),
          ctx.spiralOrigin,
          ctx.gradeThresholds
        );

        // Combine all section analyses for the overall report
        const allAnalyses = sections.flatMap((s) => s.analyses);
        const mergedAnalyses: AnalysisResult[] = [];
        const categories = ["layout", "typography", "spacing", "density", "noise"] as const;
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

        const report = buildFullReport(
          url,
          { width: viewport_width, height: viewport_height },
          mergedAnalyses,
          sections,
          ctx.weights,
          ctx.gradeThresholds,
          ctx.pageType
        );
        const text = formatFullReport(report, format);

        // Build content: full page screenshot, then per-section screenshots, then text
        type ContentItem =
          | { type: "image"; data: string; mimeType: "image/png" }
          | { type: "text"; text: string };
        const content: ContentItem[] = [];

        content.push({ type: "image" as const, data: fullPageScreenshot, mimeType: "image/png" as const });

        for (const section of sections) {
          if (section.screenshot) {
            content.push({
              type: "text" as const,
              text: `--- ${section.label}: ${section.grade} (score: ${section.score}) ---`,
            });
            content.push({ type: "image" as const, data: section.screenshot, mimeType: "image/png" as const });
          }
        }

        content.push({ type: "text" as const, text });

        return { content };
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
