// Build the README preview from the animated benchmark grid videos.
//
//   node scripts/make-preview.mjs [options] [input.mp4 ...]
//
// Inputs default to every examples/*/grid.mp4. Outputs:
//   docs/preview.mp4  — compressed h264 (nice quality, small; for linking)
//   docs/preview.webp — README-embeddable animation (GitHub markdown cannot
//                       play repo-hosted mp4s inline; animated WebP is ~3-5×
//                       smaller than GIF for this kind of content)
//
// Options:
//   --width N    output width in px           (default 840)
//   --fps N      WebP frame rate              (default 12)
//   --q N        WebP quality 0-100           (default 62)
//   --crf N      mp4 quality, lower = bigger  (default 30)
//   --out PATH   output basename              (default docs/preview)
//   --webp-only  emit only the animated WebP (skip the mp4 output)
//
// Re-run after regenerating animated benchmarks, then commit docs/preview.*
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import ffmpegPath from "ffmpeg-static";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return dflt;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const width = Number(opt("width", 840));
const fps = Number(opt("fps", 12));
const q = String(opt("q", 62));
const crf = String(opt("crf", 30));
const outBase = resolve(ROOT, opt("out", "docs/preview"));
const webpOnlyIdx = args.indexOf("--webp-only");
const webpOnly = webpOnlyIdx !== -1;
if (webpOnly) args.splice(webpOnlyIdx, 1);

let inputs = args;
if (inputs.length === 0) {
  const exDir = join(ROOT, "examples");
  inputs = readdirSync(exDir)
    .map((d) => join(exDir, d, "grid.mp4"))
    .filter((p) => existsSync(p))
    .sort();
}
if (inputs.length === 0) {
  console.error("No grid.mp4 inputs found (run an animated benchmark first).");
  process.exit(1);
}

const ff = (fargs) => execFileSync(ffmpegPath, ["-y", ...fargs], { stdio: ["ignore", "ignore", "pipe"] });

// Normalize every input to the SAME exact frame, then concatenate. Grids can
// differ by a few px in height (a "no output" placeholder cell is a different
// height than a rendered one), and concat requires identical dimensions — so we
// fit each into a fixed box and pad to it. The pad color matches the grid
// background, so the letterboxing is invisible.
const padH = Math.round((width * 0.645) / 2) * 2;
const scale =
  `scale=${width}:${padH}:force_original_aspect_ratio=decrease:flags=lanczos,` +
  `pad=${width}:${padH}:(ow-iw)/2:(oh-ih)/2:color=0x050507,` +
  `setsar=1,fps=24,format=yuv420p`;
const inArgs = inputs.flatMap((p) => ["-i", p]);
const filters = inputs.map((_, i) => `[${i}:v]${scale}[v${i}]`).join(";");
const concat = inputs.map((_, i) => `[v${i}]`).join("") + `concat=n=${inputs.length}:v=1:a=0[out]`;

console.log(`▶ preview from ${inputs.length} clip(s):`);
inputs.forEach((p) => console.log(`  • ${p.replace(ROOT + "/", "")}`));

// Animated WebP — GitHub renders it in <img>/markdown, at a fraction of GIF size.
const webpFrom = (src) =>
  ff(["-i", src,
    "-vf", `scale=${width}:-2:flags=lanczos,fps=${fps}`,
    "-c:v", "libwebp", "-lossless", "0", "-q:v", q, "-compression_level", "6",
    "-loop", "0", "-an",
    `${outBase}.webp`]);

if (webpOnly && inputs.length === 1) {
  // Single input, WebP only: convert directly, no intermediate mp4.
  webpFrom(inputs[0]);
} else {
  ff([...inArgs, "-filter_complex", `${filters};${concat}`, "-map", "[out]",
    "-c:v", "libx264", "-crf", crf, "-preset", "veryslow", "-movflags", "+faststart",
    `${outBase}.mp4`]);
  webpFrom(`${outBase}.mp4`);
  if (webpOnly) rmSync(`${outBase}.mp4`);
}

for (const ext of webpOnly ? ["webp"] : ["mp4", "webp"]) {
  const f = `${outBase}.${ext}`;
  console.log(`  → ${f.replace(ROOT + "/", "")}  ${(statSync(f).size / 1e6).toFixed(1)} MB`);
}
