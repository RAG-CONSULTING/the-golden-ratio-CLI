#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const isCI = process.env.CI === "true";

console.log("[golden-ratio-cli] Ensuring Chromium browser is available...");

try {
  execFileSync("npx", ["playwright", "install", "chromium"], {
    stdio: isCI ? "pipe" : "inherit",
    timeout: 120_000,
    shell: process.platform === "win32",
  });
  console.log("[golden-ratio-cli] Chromium ready.");
} catch {
  console.warn(
    "[golden-ratio-cli] Warning: Could not auto-install Chromium.\n" +
      "  Run manually: npx playwright install chromium\n"
  );
}
