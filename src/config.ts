import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { BenchmarkConfig, ModelEntry } from "./types.js";

const REQUIRED_TOP_LEVEL = ["name", "prompt", "models"] as const;

/** Load and validate a benchmark config JSON file. */
export function loadConfig(path: string): BenchmarkConfig {
  const abs = resolve(path);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(abs, "utf8"));
  } catch (err) {
    throw new Error(`Failed to read/parse config at ${abs}: ${(err as Error).message}`);
  }

  const cfg = parsed as Partial<BenchmarkConfig>;
  for (const key of REQUIRED_TOP_LEVEL) {
    if (cfg[key] == null) throw new Error(`Config missing required field: "${key}"`);
  }
  if (!Array.isArray(cfg.models) || cfg.models.length === 0) {
    throw new Error("Config must define a non-empty \"models\" array");
  }

  const seen = new Set<string>();
  for (const m of cfg.models as ModelEntry[]) {
    if (!m.slug || !m.id || !m.provider) {
      throw new Error(`Each model needs slug, id and provider. Offending entry: ${JSON.stringify(m)}`);
    }
    if (seen.has(m.slug)) throw new Error(`Duplicate model slug: "${m.slug}"`);
    seen.add(m.slug);
  }

  // Fill defaults so the rest of the pipeline can assume fields exist.
  return withDefaults(cfg as BenchmarkConfig);
}

const DEFAULTS = {
  render: {
    viewportWidth: 1280,
    viewportHeight: 900,
    deviceScaleFactor: 1,
    fullPage: true,
    maxFullPageHeight: 4000,
    waitMs: 1500,
  },
  grid: {
    columns: 3,
    cellWidth: 640,
    padding: 24,
    background: "#0f1115",
    labelHeight: 44,
    labelColor: "#ffffff",
    labelFontSize: 22,
  },
  generation: {
    temperature: 0.7,
    maxTokens: 8000,
    concurrency: 4,
    timeoutMs: 180000,
    retries: 1,
  },
} as const;

function withDefaults(cfg: BenchmarkConfig): BenchmarkConfig {
  return {
    ...cfg,
    systemPrompt: cfg.systemPrompt ?? "",
    render: { ...DEFAULTS.render, ...cfg.render },
    grid: { ...DEFAULTS.grid, ...cfg.grid },
    generation: { ...DEFAULTS.generation, ...cfg.generation },
  };
}

/** Apply --model filtering and skipByDefault rules. */
export function selectModels(cfg: BenchmarkConfig, only?: string[]): ModelEntry[] {
  if (only && only.length > 0) {
    const set = new Set(only);
    const picked = cfg.models.filter((m) => set.has(m.slug));
    const missing = only.filter((s) => !cfg.models.some((m) => m.slug === s));
    if (missing.length) throw new Error(`Unknown model slug(s): ${missing.join(", ")}`);
    return picked;
  }
  return cfg.models.filter((m) => !m.skipByDefault);
}
