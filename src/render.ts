import { existsSync } from "node:fs";
import { chromium, type Browser } from "playwright";
import type { BenchmarkConfig, ModelEntry } from "./types.js";
import { runPaths } from "./paths.js";

export interface RenderOutcome {
  slug: string;
  label: string;
  ok: boolean;
  screenshotPath?: string;
  error?: string;
}

/**
 * Render each model's output.html in a headless Chromium and capture a PNG
 * screenshot. Models that produced no HTML are skipped (and reported).
 */
export async function render(
  cfg: BenchmarkConfig,
  models: ModelEntry[],
): Promise<RenderOutcome[]> {
  const paths = runPaths(cfg.name);
  const r = cfg.render;

  const browser: Browser = await chromium.launch({ args: ["--no-sandbox"] });
  const outcomes: RenderOutcome[] = [];
  try {
    for (const model of models) {
      const htmlPath = paths.html(model.slug);
      if (!existsSync(htmlPath)) {
        outcomes.push({
          slug: model.slug,
          label: model.label,
          ok: false,
          error: "no output.html (generation produced no HTML)",
        });
        console.log(`  • ${model.slug.padEnd(20)} skipped (no html)`);
        continue;
      }

      const context = await browser.newContext({
        viewport: { width: r.viewportWidth, height: r.viewportHeight },
        deviceScaleFactor: r.deviceScaleFactor,
      });
      const page = await context.newPage();
      try {
        // file:// load so relative assets behave; networkidle waits for fonts/img.
        await page.goto(`file://${htmlPath}`, {
          waitUntil: "networkidle",
          timeout: 30000,
        });
        if (r.waitMs > 0) await page.waitForTimeout(r.waitMs);

        // Clamp absurdly tall pages so the grid stays usable.
        let clip: { x: number; y: number; width: number; height: number } | undefined;
        if (r.fullPage) {
          const fullHeight = await page.evaluate(
            () => document.documentElement.scrollHeight,
          );
          if (fullHeight > r.maxFullPageHeight) {
            clip = {
              x: 0,
              y: 0,
              width: r.viewportWidth,
              height: r.maxFullPageHeight,
            };
          }
        }

        await page.screenshot({
          path: paths.screenshot(model.slug),
          fullPage: r.fullPage && !clip,
          clip,
        });
        outcomes.push({
          slug: model.slug,
          label: model.label,
          ok: true,
          screenshotPath: paths.screenshot(model.slug),
        });
        console.log(`  • ${model.slug.padEnd(20)} rendered`);
      } catch (err) {
        outcomes.push({
          slug: model.slug,
          label: model.label,
          ok: false,
          error: (err as Error).message,
        });
        console.log(`  • ${model.slug.padEnd(20)} render FAIL (${(err as Error).message})`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  return outcomes;
}
