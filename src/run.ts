import "dotenv/config";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { BenchmarkConfig, GenerationResult, ModelEntry } from "./types.js";
import { loadConfig, selectModels } from "./config.js";
import { generate } from "./generate.js";
import { render } from "./render.js";
import { buildGrid } from "./grid.js";
import { writeReport } from "./report.js";
import { ensureDir, runPaths } from "./paths.js";

type Stage = "all" | "generate" | "render" | "grid" | "report";

interface Args {
  config: string;
  stage: Stage;
  models?: string[];
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    config: "config/benchmark.config.json",
    stage: "all",
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--config" || a === "-c") args.config = argv[++i];
    else if (a === "--stage" || a === "-s") args.stage = argv[++i] as Stage;
    else if (a === "--model" || a === "-m")
      args.models = (args.models ?? []).concat(argv[++i].split(","));
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function printHelp() {
  console.log(`design-bench — visual design benchmark for LLMs

Usage:
  tsx src/run.ts [options]

Options:
  -c, --config <path>   Config file (default: config/benchmark.config.json)
  -s, --stage <stage>   all | generate | render | grid | report (default: all)
  -m, --model <slug>    Only run these models (comma-separated, repeatable)
      --dry-run         Skip API calls; emit placeholder HTML to test the pipeline
  -h, --help            Show this help

Stages run in order: generate → render → grid → report.
Running a later stage alone reuses artifacts already on disk.`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = loadConfig(args.config);
  const models = selectModels(cfg, args.models);
  const paths = runPaths(cfg.name);
  ensureDir(paths.root);

  console.log(`\n▶ design-bench: "${cfg.name}"  (${models.length} models, stage=${args.stage})\n`);

  const run = (s: Stage) => args.stage === "all" || args.stage === s;

  let results: GenerationResult[] = [];

  if (run("generate")) {
    console.log("① Generate — querying models");
    results = args.dryRun
      ? dryRunGenerate(cfg, models)
      : await generate(cfg, models);
  } else {
    results = loadResults(cfg, models);
  }

  if (run("render")) {
    console.log("\n② Render — screenshotting HTML with Chromium");
    await render(cfg, models);
  }

  if (run("grid")) {
    console.log("\n③ Grid — composing side-by-side PNG");
    const gridPath = await buildGrid(cfg, models);
    console.log(`  → ${gridPath}`);
  }

  if (run("report")) {
    console.log("\n④ Report — writing report.md + summary.json");
    // Reload from disk so the report picks up the render stage's findings
    // (render status, blank, etc.) which were persisted into result.json.
    const fromDisk = loadResults(cfg, models);
    const reportResults = fromDisk.length ? fromDisk : results;
    const { reportPath } = writeReport(cfg, reportResults);
    console.log(`  → ${reportPath}`);
  }

  console.log(`\n✓ Done. Artifacts in ${paths.root}\n`);
}

/** Re-load previously written result.json files for later-stage-only runs. */
function loadResults(cfg: BenchmarkConfig, models: ModelEntry[]): GenerationResult[] {
  const paths = runPaths(cfg.name);
  const out: GenerationResult[] = [];
  for (const m of models) {
    const p = paths.result(m.slug);
    if (existsSync(p)) out.push(JSON.parse(readFileSync(p, "utf8")));
  }
  return out;
}

/** Offline pipeline test: emit a deterministic placeholder page per model. */
function dryRunGenerate(cfg: BenchmarkConfig, models: ModelEntry[]): GenerationResult[] {
  const paths = runPaths(cfg.name);
  const results: GenerationResult[] = [];
  models.forEach((m, i) => {
    ensureDir(paths.modelDir(m.slug));
    const hue = (i * 47) % 360;
    const html = placeholderHtml(m.label, cfg.prompt, hue);
    writeFileSync(paths.raw(m.slug), html, "utf8");
    writeFileSync(paths.html(m.slug), html, "utf8");
    const result: GenerationResult = {
      slug: m.slug,
      label: m.label,
      provider: m.provider,
      modelId: m.id,
      ok: true,
      htmlExtracted: true,
      elapsedMs: 0,
      startedAt: new Date().toISOString(),
    };
    writeFileSync(paths.result(m.slug), JSON.stringify(result, null, 2));
    results.push(result);
    console.log(`  • ${m.slug.padEnd(20)} dry-run placeholder`);
  });
  return results;
}

function placeholderHtml(label: string, prompt: string, hue: number): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box;font-family:Helvetica,Arial,sans-serif}
  body{background:linear-gradient(135deg,hsl(${hue} 70% 55%),hsl(${(hue + 60) % 360} 70% 45%));color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px;text-align:center}
  h1{font-size:64px;margin-bottom:16px;text-shadow:0 4px 20px rgba(0,0,0,.3)}
  p{max-width:680px;font-size:20px;opacity:.9;line-height:1.5}
  .tag{margin-top:32px;padding:12px 28px;background:rgba(255,255,255,.2);border-radius:999px;font-weight:600}
  </style></head><body>
  <h1>${label}</h1>
  <p>${prompt.slice(0, 220)}…</p>
  <div class="tag">dry-run placeholder render</div>
  </body></html>`;
}

main().catch((err) => {
  console.error("\n✗ design-bench failed:", err.message ?? err);
  process.exit(1);
});
