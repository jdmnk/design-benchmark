// Build the static data the showcase web app renders.
//
// Reads the benchmark configs + the committed example runs and emits:
//   web/src/data/benchmarks.json   — prompts, settings, per-model metadata
//   web/public/grids/<key>.webp    — the grid image for each run
//   web/public/pages/<key>/*.html  — each model's actual output (for "open" links)
//
// A benchmark can hold more than one run: run 1 lives at examples/<id>/, and
// additional runs at examples/<id>/run-2, run-3, … Each run is emitted under a
// filesystem key (`<id>` for run 1, `<id>-2` for run 2) and surfaced in the
// web app as a tab. Prompt/description/render config are shared across runs.
//
// Run locally after benchmarks (it also peeks at results/ for render status),
// then commit web/src/data + web/public so Vercel builds purely from committed files.
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync, rmSync } from "node:fs";
import { basename, join, resolve, dirname } from "node:path";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
// Space videos lead. `runOrder` (1-based original run numbers) reorders a
// benchmark's run tabs — the first entry becomes the default-selected tab;
// labels stay tied to each run's chronological identity (Run 1/2/3).
const BENCHES = [
  { configPath: "config/examples/black-hole-spin.config.json", runOrder: [2, 1, 3] },
  { configPath: "config/examples/ringed-giant.config.json" },
  { configPath: "config/examples/pulsar-css.config.json" },
  { configPath: "config/examples/black-hole.config.json" },
  { configPath: "config/examples/fireworks.config.json" },
  { configPath: "config/examples/sunset-svg.config.json" },
  { configPath: "config/benchmark.config.json" },
];
// How many additional runs (run-2, run-3, …) to look for beyond the top-level run.
const MAX_EXTRA_RUNS = 8;

const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

function statusOf(m) {
  if (!m.ok) return "error";
  if (!m.htmlExtracted) return "no-html";
  if (m.render) {
    if (m.render.blank) return "blank";
    if (!m.render.rendered) return "render-failed";
    return m.truncated ? "truncated" : "rendered";
  }
  // Old runs without a persisted render verdict: assume the extracted HTML rendered.
  return m.truncated ? "truncated" : "rendered";
}

const gridsDir = join(ROOT, "web/public/grids");
const pagesDir = join(ROOT, "web/public/pages");
if (existsSync(gridsDir)) rmSync(gridsDir, { recursive: true });
mkdirSync(gridsDir, { recursive: true });
if (existsSync(pagesDir)) rmSync(pagesDir, { recursive: true });
mkdirSync(pagesDir, { recursive: true });

/**
 * Build one run from an example directory. `key` is the unique filesystem
 * name used for its copied grid + pages (id for run 1, `<id>-2` for run 2).
 */
function buildRun(exDir, key, label) {
  const summary = read(join(exDir, "summary.json"));

  // grid image (+ grid video for animated benchmarks). Prefer the WebP — it's
  // ~10× smaller than the PNG at the same resolution; fall back for old runs.
  const webpSrc = join(ROOT, exDir, "grid.webp");
  const hasWebp = existsSync(webpSrc);
  const imageFile = hasWebp ? `${key}.webp` : `${key}.png`;
  copyFileSync(hasWebp ? webpSrc : join(ROOT, exDir, "grid.png"), join(gridsDir, imageFile));
  const gridVideoSrc = join(ROOT, exDir, "grid.mp4");
  const hasVideo = existsSync(gridVideoSrc);
  if (hasVideo) copyFileSync(gridVideoSrc, join(gridsDir, `${key}.mp4`));

  // model output pages (so the app can link "open" to the real render)
  const pagesSrc = join(ROOT, exDir, "pages");
  const pageSet = new Set();
  if (existsSync(pagesSrc)) {
    mkdirSync(join(pagesDir, key), { recursive: true });
    for (const f of readdirSync(pagesSrc)) {
      if (f.endsWith(".html")) {
        copyFileSync(join(pagesSrc, f), join(pagesDir, key, f));
        pageSet.add(basename(f, ".html"));
      }
    }
  }

  const models = summary.models.map((m) => ({
    label: m.label,
    modelId: m.modelId,
    provider: m.provider,
    status: statusOf(m),
    elapsedMs: m.elapsedMs,
    outputTokens: m.usage?.completionTokens ?? m.usage?.totalTokens ?? null,
    costUsd: m.usage?.costUsd ?? null,
    truncated: Boolean(m.truncated),
    error: cleanError(m.error ?? m.render?.error),
    page: pageSet.has(m.slug) ? `pages/${key}/${m.slug}.html` : null,
  }));

  return {
    label,
    grid: {
      image: `grids/${imageFile}`,
      video: hasVideo ? `grids/${key}.mp4` : null,
    },
    models,
    rendered: models.filter((m) => m.status === "rendered" || m.status === "truncated").length,
    total: models.length,
  };
}

const benchmarks = BENCHES.map(({ configPath, runOrder }) => {
  const cfg = read(configPath);
  const id = cfg.name;
  const baseDir = join("examples", id);

  // Run 1 at the folder top level; run-2, run-3, … as subdirectories.
  let runs = [buildRun(baseDir, id, "Run 1")];
  for (let n = 2; n <= MAX_EXTRA_RUNS + 1; n++) {
    const sub = join(baseDir, `run-${n}`);
    if (!existsSync(join(ROOT, sub, "summary.json"))) break;
    runs.push(buildRun(sub, `${id}-${n}`, `Run ${n}`));
  }
  // Optional custom tab order (1-based run numbers). First entry is the
  // default-selected tab; any run not listed keeps its place after the rest.
  if (runOrder) {
    const picked = runOrder.map((n) => runs[n - 1]).filter(Boolean);
    const leftover = runs.filter((r) => !picked.includes(r));
    runs = [...picked, ...leftover];
  }

  return {
    id,
    title: titleCase(id),
    description: cfg.description ?? "",
    prompt: cfg.prompt,
    systemPrompt: cfg.systemPrompt ?? "",
    render: {
      viewport: `${cfg.render?.viewportWidth ?? 1280}×${cfg.render?.viewportHeight ?? 800}`,
      fullPage: cfg.render?.fullPage ?? false,
      waitMs: cfg.render?.waitMs ?? 0,
      deterministic: Boolean(cfg.render?.freezeClock),
      video: cfg.render?.video
        ? { durationMs: cfg.render.video.durationMs, fps: cfg.render.video.fps }
        : null,
    },
    columns: cfg.grid?.columns ?? 3,
    runs,
  };
});

// Trim the noisy raw-JSON tail off provider errors and humanize common ones.
function cleanError(err) {
  if (!err) return null;
  let e = String(err).split(/\.?\s*Raw:/)[0].trim();
  if (/empty completion/i.test(e)) e = "Empty completion — model returned no content (often a reasoning model that ran out of tokens before answering).";
  else if (/aborted/i.test(e)) e = "Timed out before completing.";
  return e.length > 160 ? e.slice(0, 157) + "…" : e;
}

function titleCase(id) {
  return id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const outDir = join(ROOT, "web/src/data");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "benchmarks.json"), JSON.stringify({ benchmarks }, null, 2) + "\n");
console.log(`Wrote ${benchmarks.length} benchmarks → web/src/data/benchmarks.json`);
for (const b of benchmarks) {
  for (const r of b.runs) {
    console.log(`  • ${b.id} ${r.label}: ${r.rendered}/${r.total} rendered, ${r.models.filter((m) => m.page).length} pages`);
  }
}
