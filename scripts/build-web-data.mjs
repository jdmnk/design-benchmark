// Build the static data the showcase web app renders.
//
// Reads the benchmark configs + the committed example runs and emits:
//   web/src/data/benchmarks.json   — prompts, settings, per-model metadata
//   web/public/grids/<id>.png      — the grid image for each benchmark
//   web/public/pages/<id>/*.html   — each model's actual output (for "open" links)
//
// Run locally after benchmarks (it also peeks at results/ for render status),
// then commit web/src/data + web/public so Vercel builds purely from committed files.
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync, rmSync } from "node:fs";
import { basename, join, resolve, dirname } from "node:path";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const BENCHES = [
  { configPath: "config/benchmark.config.json" },
  { configPath: "config/examples/black-hole.config.json" },
  { configPath: "config/examples/sunset-svg.config.json" },
];

const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

function statusOf(name, m) {
  if (!m.ok) return "error";
  if (!m.htmlExtracted) return "no-html";
  const shot = join(ROOT, "results", name, "models", m.slug, "screenshot.png");
  return existsSync(shot) ? "rendered" : "render-failed";
}

const gridsDir = join(ROOT, "web/public/grids");
const pagesDir = join(ROOT, "web/public/pages");
mkdirSync(gridsDir, { recursive: true });
if (existsSync(pagesDir)) rmSync(pagesDir, { recursive: true });
mkdirSync(pagesDir, { recursive: true });

const benchmarks = BENCHES.map(({ configPath }) => {
  const cfg = read(configPath);
  const id = cfg.name;
  const exDir = join("examples", id);
  const summary = read(join(exDir, "summary.json"));

  // grid image
  copyFileSync(join(ROOT, exDir, "grid.png"), join(gridsDir, `${id}.png`));

  // model output pages (so the app can link "open" to the real render)
  const pagesSrc = join(ROOT, exDir, "pages");
  const pageSet = new Set();
  if (existsSync(pagesSrc)) {
    mkdirSync(join(pagesDir, id), { recursive: true });
    for (const f of readdirSync(pagesSrc)) {
      if (f.endsWith(".html")) {
        copyFileSync(join(pagesSrc, f), join(pagesDir, id, f));
        pageSet.add(basename(f, ".html"));
      }
    }
  }

  const models = summary.models.map((m) => ({
    label: m.label,
    modelId: m.modelId,
    provider: m.provider,
    status: statusOf(id, m),
    elapsedMs: m.elapsedMs,
    outputTokens: m.usage?.completionTokens ?? m.usage?.totalTokens ?? null,
    error: cleanError(m.error),
    page: pageSet.has(m.slug) ? `pages/${id}/${m.slug}.html` : null,
  }));

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
    },
    grid: { image: `grids/${id}.png`, columns: cfg.grid?.columns ?? 3 },
    models,
    rendered: models.filter((m) => m.status === "rendered").length,
    total: models.length,
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
for (const b of benchmarks) console.log(`  • ${b.id}: ${b.rendered}/${b.total} rendered, ${b.models.filter((m) => m.page).length} pages`);
