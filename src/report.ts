import { writeFileSync } from "node:fs";
import type { BenchmarkConfig, GenerationResult } from "./types.js";
import { runPaths } from "./paths.js";

/**
 * Write a human-readable report.md and a machine-readable summary.json for a run.
 */
export function writeReport(
  cfg: BenchmarkConfig,
  results: GenerationResult[],
): { reportPath: string; summaryPath: string } {
  const paths = runPaths(cfg.name);

  const statusOf = (r: (typeof results)[number]) => {
    if (!r.ok) return "❌ error";
    if (!r.htmlExtracted) return "⚠️ no html";
    if (r.render && !r.render.rendered) return r.render.blank ? "⬛ blank" : "❌ render failed";
    if (r.render?.rendered) return r.truncated ? "✂️ rendered (truncated)" : "✅ rendered";
    return r.truncated ? "✂️ html (truncated)" : "✅ html";
  };
  const rows = results
    .map((r) => {
      const tokens = r.usage?.totalTokens ?? "—";
      const note = (r.error ?? r.render?.error ?? "").replace(/\|/g, "\\|").slice(0, 80);
      return `| ${r.label} | \`${r.modelId}\` | ${r.provider} | ${statusOf(r)} | ${(r.elapsedMs / 1000).toFixed(1)}s | ${tokens} | ${note} |`;
    })
    .join("\n");

  // "Rendered" = produced a real, non-blank screenshot (executability rate).
  const okCount = results.filter((r) => r.render?.rendered).length;

  const md = `# ${cfg.name}

${cfg.description ?? ""}

**Models:** ${results.length} · **Rendered:** ${okCount}/${results.length}

## Prompt

> ${cfg.prompt.replace(/\n/g, "\n> ")}

## Grid

![grid](./grid.png)

## Results

| Model | ID | Provider | Status | Time | Tokens | Note |
|-------|----|----------|--------|------|--------|------|
${rows}

Per-model artifacts live in \`models/<slug>/\` (\`raw.txt\`, \`output.html\`, \`screenshot.png\`, \`result.json\`).
`;

  writeFileSync(paths.report, md);

  const summary = {
    name: cfg.name,
    prompt: cfg.prompt,
    generatedAt: new Date().toISOString(),
    models: results,
  };
  writeFileSync(paths.summary, JSON.stringify(summary, null, 2));

  return { reportPath: paths.report, summaryPath: paths.summary };
}
