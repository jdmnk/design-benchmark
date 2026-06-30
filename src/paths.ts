import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

/** Centralised layout of where artifacts for a run live on disk. */
export function runPaths(runName: string) {
  const root = resolve("results", runName);
  return {
    root,
    modelDir: (slug: string) => join(root, "models", slug),
    html: (slug: string) => join(root, "models", slug, "output.html"),
    screenshot: (slug: string) => join(root, "models", slug, "screenshot.png"),
    raw: (slug: string) => join(root, "models", slug, "raw.txt"),
    result: (slug: string) => join(root, "models", slug, "result.json"),
    grid: join(root, "grid.png"),
    report: join(root, "report.md"),
    summary: join(root, "summary.json"),
  };
}

export function ensureDir(path: string) {
  mkdirSync(path, { recursive: true });
}
