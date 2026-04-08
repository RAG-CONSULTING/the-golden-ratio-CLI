#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAnalyzeElement } from "./tools/analyze-element.js";
import { registerAnalyzeLayout } from "./tools/analyze-layout.js";
import { registerAnalyzeTypography } from "./tools/analyze-typography.js";
import { registerAnalyzeSpacing } from "./tools/analyze-spacing.js";
import { registerGenerateReport } from "./tools/generate-report.js";
import { registerAnalyzeDensity } from "./tools/analyze-density.js";
import { registerAnalyzeNoise } from "./tools/analyze-noise.js";

const server = new McpServer(
  {
    name: "golden-ratio-cli",
    version: "0.1.0",
  },
  {
    instructions:
      "Golden ratio (φ ≈ 1.618) validation tools for web design. " +
      "IMPORTANT: Before running any analysis, ask the user: " +
      "(1) What type of page is this? (landing page, SaaS/dashboard, portfolio, e-commerce, blog, or general) " +
      "(2) What is the primary goal — full audit, or focus on typography/spacing/layout? " +
      "(3) Where should the user's eye be drawn on this page? (helps set spiral orientation) " +
      "Use the page_type parameter to apply context-appropriate weights, selectors, and tolerances. " +
      "Use generate_report for comprehensive section-by-section analysis, or individual tools for focused checks. " +
      "All tools require a URL of a running website (e.g. http://localhost:3000).",
  }
);

registerAnalyzeLayout(server);
registerAnalyzeTypography(server);
registerAnalyzeSpacing(server);
registerAnalyzeElement(server);
registerAnalyzeDensity(server);
registerAnalyzeNoise(server);
registerGenerateReport(server);

const transport = new StdioServerTransport();
await server.connect(transport);
