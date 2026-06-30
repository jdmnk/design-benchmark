import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, type Browser } from "playwright";
import sharp from "sharp";
import type { BenchmarkConfig, GenerationResult, ModelEntry, RenderInfo } from "./types.js";
import { runPaths } from "./paths.js";
import { startRenderServer } from "./server.js";

export interface RenderOutcome {
  slug: string;
  label: string;
  ok: boolean;
  blank?: boolean;
  screenshotPath?: string;
  error?: string;
}

/**
 * A near-uniform screenshot (very low per-channel variance) is a blank/black
 * page that "rendered" but shows nothing — a real failure mode we must not count
 * as a success. ~3/255 std-dev tolerates AA/compression noise while still
 * catching solid-color pages. (Per the resilience guide's pixel-stat gate.)
 */
const BLANK_STDDEV = 3;

async function isBlankScreenshot(path: string): Promise<boolean> {
  try {
    const stats = await sharp(path).stats();
    const rgb = stats.channels.slice(0, 3).map((c) => c.stdev);
    return Math.max(...rgb) < BLANK_STDDEV;
  } catch {
    return false;
  }
}

/** Merge what the render stage learned back into the model's result.json. */
function persistRenderInfo(resultPath: string, info: RenderInfo) {
  if (!existsSync(resultPath)) return;
  try {
    const result = JSON.parse(readFileSync(resultPath, "utf8")) as GenerationResult;
    result.render = info;
    writeFileSync(resultPath, JSON.stringify(result, null, 2));
  } catch {
    /* best-effort */
  }
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

  const browser: Browser = await chromium.launch({
    // --disable-dev-shm-usage avoids "/dev/shm too small" renderer crashes in
    // containers (per the resilience guide); --no-sandbox for rootless hosts.
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const outcomes: RenderOutcome[] = [];
  try {
    for (const model of models) {
      const htmlPath = paths.html(model.slug);
      const resultPath = paths.result(model.slug);
      if (!existsSync(htmlPath)) {
        const error = "no output.html (generation produced no HTML)";
        persistRenderInfo(resultPath, { rendered: false, error });
        outcomes.push({ slug: model.slug, label: model.label, ok: false, error });
        console.log(`  • ${model.slug.padEnd(20)} skipped (no html)`);
        continue;
      }

      const context = await browser.newContext({
        viewport: { width: r.viewportWidth, height: r.viewportHeight },
        deviceScaleFactor: r.deviceScaleFactor,
      });
      const page = await context.newPage();
      // Capture failure signals BEFORE navigating so we can explain blanks.
      let pageError: string | undefined;
      page.on("pageerror", (e) => { if (!pageError) pageError = `JS error: ${e.message}`; });
      page.on("crash", () => { if (!pageError) pageError = "renderer crashed (out of memory?)"; });
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
          // networkidle fires before client-side animation paints; a double rAF
          // guarantees at least one painted frame before we capture (the guide's
          // #1 fix for false blanks). Skipped when freezing (rAF is shimmed).
          await page
            .evaluate(
              () =>
                new Promise<void>((res) =>
                  requestAnimationFrame(() => requestAnimationFrame(() => res())),
                ),
            )
            .catch(() => {});
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

        const shotPath = paths.screenshot(model.slug);
        await page.screenshot({
          path: shotPath,
          fullPage: r.fullPage && !clip,
          clip,
          timeout: r.screenshotTimeoutMs ?? 60000,
        });

        const blank = await isBlankScreenshot(shotPath);
        persistRenderInfo(resultPath, { rendered: !blank, blank, error: blank ? pageError : undefined });
        outcomes.push({
          slug: model.slug,
          label: model.label,
          ok: true,
          blank,
          screenshotPath: shotPath,
        });
        console.log(`  • ${model.slug.padEnd(20)} ${blank ? "rendered (blank)" : "rendered"}${blank && pageError ? ` — ${pageError}` : ""}`);
      } catch (err) {
        const error = pageError ?? (err as Error).message;
        persistRenderInfo(resultPath, { rendered: false, error });
        outcomes.push({ slug: model.slug, label: model.label, ok: false, error });
        console.log(`  • ${model.slug.padEnd(20)} render FAIL (${error})`);
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
