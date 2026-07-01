import { writeFileSync } from "node:fs";
import type {
  BenchmarkConfig,
  GenerationResult,
  ModelEntry,
} from "./types.js";
import { makeProviderRegistry } from "./providers/index.js";
import { extractHtml } from "./html.js";
import { ensureDir, runPaths } from "./paths.js";

/**
 * Run every selected model against the single benchmark prompt, extract the
 * HTML, and persist raw + html + result.json per model. Returns the results.
 */
export async function generate(
  cfg: BenchmarkConfig,
  models: ModelEntry[],
): Promise<GenerationResult[]> {
  const registry = makeProviderRegistry();
  const { concurrency, retries } = cfg.generation;

  // Eagerly construct providers so a missing API key fails fast & clearly,
  // before we kick off any work.
  for (const provider of new Set(models.map((m) => m.provider))) {
    registry.get(provider);
  }

  const results: GenerationResult[] = [];
  const queue = [...models];

  async function worker() {
    for (;;) {
      const model = queue.shift();
      if (!model) return;
      const result = await generateOne(cfg, model, registry, retries);
      results.push(result);
      const status = result.ok ? "ok" : `FAIL (${result.error})`;
      console.log(`  • ${model.slug.padEnd(20)} ${status}  ${result.elapsedMs}ms`);
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, worker);
  await Promise.all(workers);

  // Preserve config order in the returned list.
  const order = new Map(models.map((m, i) => [m.slug, i]));
  results.sort((a, b) => (order.get(a.slug)! - order.get(b.slug)!));
  return results;
}

async function generateOne(
  cfg: BenchmarkConfig,
  model: ModelEntry,
  registry: ReturnType<typeof makeProviderRegistry>,
  retries: number,
): Promise<GenerationResult> {
  const paths = runPaths(cfg.name);
  ensureDir(paths.modelDir(model.slug));
  const provider = registry.get(model.provider);
  const startedAt = new Date().toISOString();
  const start = Date.now();

  const messages = [
    ...(cfg.systemPrompt
      ? [{ role: "system" as const, content: cfg.systemPrompt }]
      : []),
    { role: "user" as const, content: cfg.prompt },
  ];

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await provider.chat({
        modelId: model.id,
        messages,
        temperature: model.temperature ?? cfg.generation.temperature,
        maxTokens: model.maxTokens ?? cfg.generation.maxTokens,
        timeoutMs: cfg.generation.timeoutMs,
        reasoningEffort: model.reasoningEffort ?? cfg.generation.reasoningEffort,
      });

      writeFileSync(paths.raw(model.slug), res.text, "utf8");
      const html = extractHtml(res.text);
      if (html) writeFileSync(paths.html(model.slug), html, "utf8");

      const result: GenerationResult = {
        slug: model.slug,
        label: model.label,
        provider: model.provider,
        modelId: model.id,
        ok: true,
        rawResponse: undefined, // kept on disk in raw.txt, not duplicated here
        htmlExtracted: Boolean(html),
        finishReason: res.finishReason,
        truncated: res.finishReason === "length",
        elapsedMs: Date.now() - start,
        usage: res.usage,
        startedAt,
      };
      writeFileSync(paths.result(model.slug), JSON.stringify(result, null, 2));
      return result;
    } catch (err) {
      lastErr = err;
    }
  }

  const result: GenerationResult = {
    slug: model.slug,
    label: model.label,
    provider: model.provider,
    modelId: model.id,
    ok: false,
    error: (lastErr as Error)?.message ?? String(lastErr),
    htmlExtracted: false,
    elapsedMs: Date.now() - start,
    startedAt,
  };
  writeFileSync(paths.result(model.slug), JSON.stringify(result, null, 2));
  return result;
}
