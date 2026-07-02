# Examples

Real runs of Design Bench. There's also a **showcase web app** that presents these with
the prompts and per-model metadata — see [`web/`](../web).

Every example uses the **same 9 models** (see
[`config/models/standard-9.json`](../config/models/standard-9.json)):

> GLM 5.2 · Grok 4.3 · GPT-5.4 mini · Claude Haiku 4.5 · Qwen3.7 Plus · Gemini 3.1 Flash-Lite · DeepSeek V4 Pro · Kimi K2.6 · Mistral Small 4

Each folder has the grid (lossless `grid.png` + a ~10× smaller `grid.webp`), a `report.md`, a `summary.json`
(per-model time + tokens + status), and `pages/` (the actual HTML each model produced —
open them in a browser). Each grid cell carries a thin top-bar label: model name · time ·
output tokens. Reproduce any with:

```bash
npm run bench                                                  # festival-landing (default)
npm run bench -- --config config/examples/black-hole.config.json
npm run bench -- --config config/examples/black-hole-spin.config.json   # animated
npm run bench -- --config config/examples/fireworks.config.json         # animated
npm run bench -- --config config/examples/sunset-svg.config.json
```

The 3D and SVG prompts are **detailed and prescriptive** so the comparison is about
execution; the website prompt fixes the *content* but deliberately leaves the *art
direction* open, so design sensibilities diverge as far as possible.

---

## festival-landing — an expressive website brief

The landing page for «EMBERWAVE», a fictional desert electronic-music festival. Same
required content for every model (wordmark, date/place, CTA, a fixed six-act lineup,
a phase-2 badge — all above the fold), but the visual concept is each model's own call.
Config: [`config/benchmark.config.json`](../config/benchmark.config.json).

![festival-landing](festival-landing/grid.webp)

## black-hole — Interstellar "Gargantua" in three.js / WebGL

A hard, very prescriptive 3D brief: black event-horizon sphere, near-edge-on accretion
disk, gravitational-lensing halo arcs, photon ring, specific colors and camera. It
discriminates sharply — quality ranges from photoreal-ish lensing to bare rings, and the
occasional model still fails outright (recorded per model in the summary). Config:
[`config/examples/black-hole.config.json`](../config/examples/black-hole.config.json).

![black-hole](black-hole/grid.webp)

## black-hole-spin — the animated one 🎬

The same Gargantua composition, but judged in motion: a **5-second clip** (24 fps) is
captured per model on the deterministic virtual clock — frame-stepped, so even scenes that
crawl in software WebGL yield a smooth clip — and composed into one **[grid video](black-hole-spin/grid.mp4)**
with the same layout as the image grids. The animation below IS the grid video (embedded as animated WebP — click through for the full-quality mp4); the
prompt demands framerate-independent rotation (~25–40°/s) with visible disk structure so
the motion actually reads. Per-model clips are in [`black-hole-spin/clips/`](black-hole-spin/clips).
Config: [`config/examples/black-hole-spin.config.json`](../config/examples/black-hole-spin.config.json).

[![black-hole-spin — animated grid](black-hole-spin/grid-anim.webp)](black-hole-spin/grid.mp4)

## fireworks — animated Canvas 2D 🎬

A continuous fireworks finale over a city skyline, judged in motion: 3–6 bursts visible at
any moment, varied burst types and colors, gravity, trails and glow — pure Canvas 2D, no
libraries. Captured as a 5-second, 24 fps deterministic clip like black-hole-spin; the
harness's seeded `Math.random` makes even the "random" show reproducible.
**[Grid video](fireworks/grid.mp4)** · per-model clips in [`fireworks/clips/`](fireworks/clips).
Config: [`config/examples/fireworks.config.json`](../config/examples/fireworks.config.json).

[![fireworks — animated grid](fireworks/grid-anim.webp)](fireworks/grid.mp4)

## sunset-svg — a single inline-SVG scene

Sun setting behind a layered mountain range, with clouds and a reflecting river — exact
composition specified so outputs line up. Pure hand-coded vector art, no libraries.
Config: [`config/examples/sunset-svg.config.json`](../config/examples/sunset-svg.config.json).

![sunset-svg](sunset-svg/grid.webp)

---

### Notes

- A model that errors, times out, or returns no HTML renders as a graceful "no output"
  placeholder (still labelled with its time) — the grid always builds. The `summary.json`
  and the web app record the exact reason.
- Generation caps reasoning effort (`reasoningEffort: "low"`) so hybrid-reasoning models
  don't burn the whole token budget "thinking" and return empty output, and transient
  provider stream errors are retried once. Remaining failures are genuinely
  provider/model-side and are reported honestly per model in each `summary.json`.
