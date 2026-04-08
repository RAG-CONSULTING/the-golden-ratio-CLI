import { chromium, type Browser, type Page } from "playwright-core";

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browser && browser.isConnected()) {
    return browser;
  }
  browser = await chromium.launch({
    headless: process.env.GOLDEN_RATIO_HEADLESS !== "false",
  });
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export async function analyzePage<T>(
  url: string,
  viewportWidth: number,
  viewportHeight: number,
  extractor: (page: Page) => Promise<T>
): Promise<T> {
  const b = await getBrowser();
  const page = await b.newPage();
  await page.setViewportSize({ width: viewportWidth, height: viewportHeight });
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  try {
    return await extractor(page);
  } finally {
    await page.close();
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  await closeBrowser();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await closeBrowser();
  process.exit(0);
});
