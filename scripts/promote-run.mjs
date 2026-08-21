// Promote a finished run from results/<name>/ into examples/<name>/ — the
// committed showcase directory that build-web-data.mjs (and the READMEs) read.
//
//   node scripts/promote-run.mjs <run-name>            # → examples/<name>/
//   node scripts/promote-run.mjs <run-name> --run 2    # → examples/<name>/run-2/
//
// Copies the composite artifacts (grid.png/webp/mp4, report.md, summary.json,
// prompt.txt, system-prompt.txt) and syncs the per-model files:
//   models/<slug>/output.html → pages/<slug>.html
//   models/<slug>/clip.mp4    → clips/<slug>.mp4
// Sync means stale pages/clips for models no longer in the run are removed;
// files this script doesn't own (e.g. grid-anim.webp) are left alone.
//
// Typical incremental flow after adding a model to the lineup:
//   npm run bench -- --model <slug> [-c <config>]
//   node scripts/promote-run.mjs <run-name>
//   node scripts/build-web-data.mjs
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");

const argv = process.argv.slice(2);
let name;
let runNo = 1;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--run") runNo = Number(argv[++i]);
  else if (!argv[i].startsWith("-")) name = argv[i];
}
if (!name || !Number.isInteger(runNo) || runNo < 1) {
  console.error("Usage: node scripts/promote-run.mjs <run-name> [--run N]");
  process.exit(1);
}

const src = join(ROOT, "results", name);
const dest =
  runNo === 1
    ? join(ROOT, "examples", name)
    : join(ROOT, "examples", name, `run-${runNo}`);
if (!existsSync(join(src, "summary.json"))) {
  console.error(`No run at ${src} (missing summary.json) — run the bench first.`);
  process.exit(1);
}

mkdirSync(dest, { recursive: true });

const TOP_LEVEL = [
  "grid.png",
  "grid.webp",
  "grid.mp4",
  "report.md",
  "summary.json",
  "prompt.txt",
  "system-prompt.txt",
];
for (const f of TOP_LEVEL) {
  if (existsSync(join(src, f))) copyFileSync(join(src, f), join(dest, f));
}

/** Sync one artifact kind from every model dir into a flat <dest>/<sub> dir. */
function syncModelFiles(sub, srcFile, ext) {
  const modelsDir = join(src, "models");
  const slugs = existsSync(modelsDir) ? readdirSync(modelsDir) : [];
  const wanted = new Set();
  for (const slug of slugs) {
    const from = join(modelsDir, slug, srcFile);
    if (!existsSync(from)) continue;
    mkdirSync(join(dest, sub), { recursive: true });
    copyFileSync(from, join(dest, sub, `${slug}${ext}`));
    wanted.add(`${slug}${ext}`);
  }
  const outDir = join(dest, sub);
  if (!existsSync(outDir)) return wanted.size;
  for (const f of readdirSync(outDir)) {
    if (f.endsWith(ext) && !wanted.has(f)) {
      rmSync(join(outDir, f));
      console.log(`  − removed stale ${sub}/${f}`);
    }
  }
  return wanted.size;
}

const pages = syncModelFiles("pages", "output.html", ".html");
const clips = syncModelFiles("clips", "clip.mp4", ".mp4");

console.log(
  `Promoted results/${name} → ${dest.replace(ROOT + "/", "")} (${pages} pages, ${clips} clips)`,
);
console.log("Now run: node scripts/build-web-data.mjs");
