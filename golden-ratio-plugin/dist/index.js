#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAnalyzeElement } from "./tools/analyze-element.js";
import { registerAnalyzeLayout } from "./tools/analyze-layout.js";
import { registerAnalyzeTypography } from "./tools/analyze-typography.js";
import { registerAnalyzeSpacing } from "./tools/analyze-spacing.js";
import { registerGenerateReport } from "./tools/generate-report.js";
const server = new McpServer({
    name: "golden-ratio-cli",
    version: "0.1.0",
}, {
    instructions: "Golden ratio (φ ≈ 1.618) validation tools for web design. " +
        "Use analyze_layout for a full page audit, analyze_typography for font scale checks, " +
        "analyze_spacing for margin/padding harmony, analyze_element for a specific CSS selector, " +
        "or generate_report for a comprehensive scored report combining all analyses. " +
        "All tools require a URL of a running website (e.g. http://localhost:3000).",
});
registerAnalyzeLayout(server);
registerAnalyzeTypography(server);
registerAnalyzeSpacing(server);
registerAnalyzeElement(server);
registerGenerateReport(server);
const transport = new StdioServerTransport();
await server.connect(transport);
//# sourceMappingURL=index.js.map