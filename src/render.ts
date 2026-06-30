import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, type Browser } from "playwright";
import type { BenchmarkConfig, ModelEntry } from "./types.js";
import { runPaths } from "./paths.js";
import { startRenderServer } from "./server.js";

export interface RenderOutcome {
  slug: string;
  label: string;
  ok: boolean;
  screenshotPath?: string;
  error?: string;
}

/**
 * Render each model's output.html in a headless Chromium and capture a PNG
 * screenshot. Pages are served over a local HTTP server (so ES-module imports,
 * importmaps and three.js add-ons work), with Math.random seeded and — when
 * render.freezeClock is set — a virtual clock advanced by exactly waitMs, so a
 * model's animated render captures the same frame on every run.
 * Models that produced no HTML are skipped (and reported).
 */
export async function render(
  cfg: BenchmarkConfig,
  models: ModelEntry[],
): Promise<RenderOutcome[]> {
  const paths = runPaths(cfg.name);
  const r = cfg.render;
  const seed = r.seed ?? 1;

  const server = await startRenderServer({
    modelsDir: resolve(paths.root, "models"),
    nodeModulesDir: resolve("node_modules"),
    importMapPath: resolve("config/importmap.json"),
  });

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
        // Before any page script runs: seed Math.random, and (when freezing)
        // install a virtual clock + requestAnimationFrame shim we fully control.
        await context.addInitScript(determinismScript(seed, r.freezeClock ?? false));

        await page.goto(server.pageUrl(model.slug), {
          waitUntil: "networkidle",
          timeout: 30000,
        });

        if (r.freezeClock) {
          // Drive a fixed number of frames at a fixed 60fps dt — fully
          // deterministic, independent of wall-clock speed.
          const frames = Math.max(1, Math.round((r.waitMs || 0) / FRAME_MS));
          await page.evaluate(
            ([n, dt]) => (window as any).__designBenchStep?.(n, dt),
            [frames, FRAME_MS] as const,
          );
        } else if (r.waitMs > 0) {
          await page.waitForTimeout(r.waitMs);
        }

        // Clamp absurdly tall pages so the grid stays usable.
        let clip: { x: number; y: number; width: number; height: number } | undefined;
        if (r.fullPage) {
          const fullHeight = await page.evaluate(
            () => document.documentElement.scrollHeight,
          );
          if (fullHeight > r.maxFullPageHeight) {
            clip = { x: 0, y: 0, width: r.viewportWidth, height: r.maxFullPageHeight };
          }
        }

        await page.screenshot({
          path: paths.screenshot(model.slug),
          fullPage: r.fullPage && !clip,
          clip,
          timeout: r.screenshotTimeoutMs ?? 60000,
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
    await server.close();
  }
  return outcomes;
}

const FRAME_MS = 1000 / 60;

/**
 * Page-context init script run before any model code. Always seeds Math.random
 * (mulberry32). When `freeze` is set, it also replaces requestAnimationFrame,
 * performance.now and Date.now with a virtual clock that only advances when we
 * call window.__designBenchStep(frames, dt) — so a model's animation reaches the
 * exact same state on every run, regardless of CPU speed. We control the clock
 * ourselves (rather than Playwright's clock API) so nothing pollutes the seeded
 * RNG sequence between load and capture.
 */
function determinismScript(seed: number, freeze: boolean): string {
  const rng = `let s = ${seed >>> 0};
    Math.random = function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };`;
  if (!freeze) return `(() => { ${rng} })();`;
  return `(() => {
    ${rng}
    let vnow = 0;
    let queue = [];
    let nextId = 1;
    const _perf = (typeof performance !== 'undefined' && performance.now) ? performance.now.bind(performance) : () => 0;
    try { performance.now = () => vnow; } catch (e) {}
    try { Date.now = () => vnow; } catch (e) {}
    window.requestAnimationFrame = (cb) => { const id = nextId++; queue.push([id, cb]); return id; };
    window.cancelAnimationFrame = (id) => { queue = queue.filter((q) => q[0] !== id); };
    window.__designBenchStep = (frames, dt) => {
      for (let i = 0; i < frames; i++) {
        vnow += dt;
        const due = queue; queue = [];
        for (const [, cb] of due) { try { cb(vnow); } catch (e) {} }
      }
    };
  })();`;
}
