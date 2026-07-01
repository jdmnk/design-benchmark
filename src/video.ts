import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import type { BenchmarkConfig, ModelEntry } from "./types.js";
import { composeGridFrame } from "./grid.js";
import { runPaths } from "./paths.js";

const run = promisify(execFile);

/**
 * Turn the per-frame captures from the render stage into videos:
 *   models/<slug>/clip.mp4  — each model's own clip
 *   grid.mp4                — every frame composed into the same grid layout
 *                             as grid.png, then encoded as one video
 * Raw frame PNGs (hundreds of MB) are deleted after a successful encode.
 */
export async function buildVideos(
  cfg: BenchmarkConfig,
  models: ModelEntry[],
): Promise<string> {
  const v = cfg.render.video;
  if (!v) throw new Error("buildVideos called without render.video config");
  if (!ffmpegPath) throw new Error("ffmpeg-static did not provide a binary for this platform");
  const paths = runPaths(cfg.name);
  const total = Math.max(1, Math.round((v.durationMs / 1000) * v.fps));

  // 1) Per-model clips. Models with fresh frames get (re-)encoded; models whose
  //    raw frames were already cleaned up but have a clip.mp4 from a previous
  //    run get their frames decoded back, so partial re-runs (--model …) still
  //    compose a full grid video instead of dropping earlier successes.
  for (const model of models) {
    const dir = paths.framesDir(model.slug);
    const clip = paths.clip(model.slug);
    const hasFrames = existsSync(dir) && readdirSync(dir).length > 0;
    if (hasFrames) {
      await encode(v.fps, `${dir}/f%05d.png`, clip);
      console.log(`  • ${model.slug.padEnd(20)} clip.mp4`);
    } else if (existsSync(clip)) {
      mkdirSync(dir, { recursive: true });
      await decode(clip, `${dir}/f%05d.png`);
      console.log(`  • ${model.slug.padEnd(20)} frames restored from clip.mp4`);
    }
  }

  // 2) Grid frames: frame i of the grid = frame i of every model (models with
  //    no frames get the same "no output" placeholder cell as the image grid).
  mkdirSync(paths.gridFramesDir, { recursive: true });
  for (let i = 0; i < total; i++) {
    await composeGridFrame(
      cfg,
      models,
      (slug) => {
        const f = paths.frame(slug, i);
        return existsSync(f) ? f : null;
      },
      paths.gridFrame(i),
    );
  }
  await encode(v.fps, `${paths.gridFramesDir}/f%05d.png`, paths.gridVideo);
  console.log(`  → ${paths.gridVideo}`);

  // 3) Reclaim the raw frames (clips + grid video are what we keep).
  rmSync(paths.gridFramesDir, { recursive: true, force: true });
  for (const model of models) {
    rmSync(paths.framesDir(model.slug), { recursive: true, force: true });
  }
  return paths.gridVideo;
}

/** mp4 → PNG sequence, numbered from f00000 to match the capture naming. */
async function decode(clipPath: string, outPattern: string) {
  await run(ffmpegPath as string, [
    "-y",
    "-i", clipPath,
    "-fps_mode", "passthrough",
    "-start_number", "0",
    outPattern,
  ]);
}

/** PNG sequence → H.264 mp4 (padded to even dimensions for yuv420p). */
async function encode(fps: number, inputPattern: string, outPath: string) {
  await run(ffmpegPath as string, [
    "-y",
    "-framerate", String(fps),
    "-i", inputPattern,
    "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-crf", "20",
    "-movflags", "+faststart",
    outPath,
  ]);
}
