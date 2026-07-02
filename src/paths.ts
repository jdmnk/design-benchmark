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
    framesDir: (slug: string) => join(root, "models", slug, "frames"),
    frame: (slug: string, i: number) =>
      join(root, "models", slug, "frames", `f${String(i).padStart(5, "0")}.png`),
    clip: (slug: string) => join(root, "models", slug, "clip.mp4"),
    gridFramesDir: join(root, "grid-frames"),
    gridFrame: (i: number) =>
      join(root, "grid-frames", `f${String(i).padStart(5, "0")}.png`),
    gridVideo: join(root, "grid.mp4"),
    grid: join(root, "grid.png"),
    gridWebp: join(root, "grid.webp"),
    report: join(root, "report.md"),
    summary: join(root, "summary.json"),
  };
}

export function ensureDir(path: string) {
  mkdirSync(path, { recursive: true });
}
