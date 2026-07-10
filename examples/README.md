# Examples

Real runs of Design Bench — a set of **space scenes**. There's also a **showcase web app**
that presents these with the prompts and per-model metadata — see [`web/`](../web).

Most examples use the **same 9 models** (see
[`config/models/standard-9.json`](../config/models/standard-9.json)):

> GLM 5.2 · Grok 4.3 · GPT-5.4 mini · Claude Haiku 4.5 · Qwen3.7 Plus · Gemini 3.1 Flash-Lite · DeepSeek V4 Pro · Kimi K2.7 Code · Kimi K2.6

**jupiter** and **black-hole-spin-sota** run a **frontier-model lineup**
([`config/models/sota-9.json`](../config/models/sota-9.json)) instead — Opus 4.8, Fable 5,
Sonnet 5 (via the local Claude CLI subscription), GPT-5.5 high and GPT-5.4 high (via the Codex
CLI), plus GLM 5.2, Qwen3.7 Plus, Grok 4.3 and Kimi K2.7 Code.

(black-hole's **Run #3** predates this lineup and used Mistral Small 4 in place of Kimi K2.7 Code —
kept as-is since it's an archived run, not reshot with the current lineup.)

Each folder has the grid (lossless `grid.png` + a ~10× smaller `grid.webp`), a `report.md`, a `summary.json`
(per-model time + tokens + status), and `pages/` (the actual HTML each model produced —
open them in a browser). Each grid cell carries a thin top-bar label: model name · time ·
output tokens. Reproduce any with:

```bash
npm run bench -- --config config/examples/black-hole-spin.config.json   # animated
npm run bench -- --config config/examples/black-hole.config.json        # still frame
npm run bench -- --config config/examples/ringed-giant.config.json      # animated
npm run bench -- --config config/examples/pulsar-css.config.json        # animated, pure CSS
```

Every prompt is **detailed and prescriptive** — the exact composition is specified so the
comparison is purely about execution: how faithfully each model renders the same scene, in
three.js/WebGL or in pure CSS.

---

## black-hole — Interstellar "Gargantua" in three.js / WebGL

The same composition as a single deterministic still frame. A hard, very prescriptive 3D
brief: black event-horizon sphere, near-edge-on accretion disk, gravitational-lensing halo
arcs, photon ring, specific colors and camera. It discriminates sharply — quality ranges
from photoreal-ish lensing to bare rings, and the occasional model still fails outright
(recorded per model in the summary). Config:
[`config/examples/black-hole.config.json`](../config/examples/black-hole.config.json).

![black-hole](black-hole/grid.webp)

**Run #2** — same prompt and models, a fresh set of generations (temperature 0.7, so the
sampling varies run to run). Switch between runs in the [web app](../web).

![black-hole run 2](black-hole/run-2/grid.webp)

**Run #3** — the original run from before the lineup swap (Mistral Small 4 instead of
Kimi K2.7 Code), recovered from git history and re-rendered through the current pipeline
so the labels match. Switch between runs in the [web app](../web).

![black-hole run 3](black-hole/run-3/grid.webp)

## ringed-giant — a Saturn-like ringed gas giant in three.js 🎬

A second animated three.js brief, sibling to black-hole-spin: a banded gas giant rotating
on its tilted axis while its ring system orbits in-plane. Prescriptive composition (ring
tilt ~18–24° off edge-on, rings occluding the planet's top half and crossing in front of
its lower half, a Cassini-style gap, a faked ring shadow) so results line up. It tests 3D
ring geometry and occlusion — where black-hole tests lensing. Captured as a 5-second, 24 fps
deterministic clip and composed into one **[grid video](ringed-giant/grid.mp4)**; per-model
clips in [`ringed-giant/clips/`](ringed-giant/clips). Config:
[`config/examples/ringed-giant.config.json`](../config/examples/ringed-giant.config.json).

[![ringed-giant — animated grid](ringed-giant/grid-anim.webp)](ringed-giant/grid.mp4)

## jupiter — a turbulent gas giant + the Great Red Spot in three.js 🎬

A close-up of Jupiter: a detailed, turbulent banded atmosphere (zones and belts
shearing past each other in opposite-direction zonal flow) with the Great Red Spot as the
signature "eye". This is the first benchmark run by a **frontier-model lineup** — Opus 4.8,
Fable 5 and Sonnet 5 through the local Claude CLI subscription, GPT-5.5 high and GPT-5.4 high
through the Codex CLI, alongside GLM 5.2, Qwen3.7 Plus, Grok 4.3 and Kimi K2.7 Code. Captured
as a 5-second, 24 fps deterministic clip. **[Grid video](jupiter/grid.mp4)** · per-model clips
in [`jupiter/clips/`](jupiter/clips). Config:
[`config/examples/jupiter.config.json`](../config/examples/jupiter.config.json).

[![jupiter — animated grid](jupiter/grid-anim.webp)](jupiter/grid.mp4)

## black-hole-spin — the animated one 🎬

The Gargantua composition judged in motion: a **5-second clip** (24 fps) is
captured per model on the deterministic virtual clock — frame-stepped, so even scenes that
crawl in software WebGL yield a smooth clip — and composed into one **[grid video](black-hole-spin/grid.mp4)**
with the same layout as the image grids. The animation below IS the grid video (embedded as animated WebP — click through for the full-quality mp4); the
prompt demands framerate-independent rotation (~25–40°/s) with visible disk structure so
the motion actually reads. Per-model clips are in [`black-hole-spin/clips/`](black-hole-spin/clips).
Config: [`config/examples/black-hole-spin.config.json`](../config/examples/black-hole-spin.config.json).

[![black-hole-spin — animated grid](black-hole-spin/grid-anim.webp)](black-hole-spin/grid.mp4)

**Run #2** — the original animated run from before the lineup swap (Mistral Small 4
instead of Kimi K2.7 Code), recovered from git history and re-rendered through the current
pipeline ([grid video](black-hole-spin/run-2/grid.mp4)). Switch between runs in the
[web app](../web).

[![black-hole-spin run 2 — animated grid](black-hole-spin/run-2/grid-anim.webp)](black-hole-spin/run-2/grid.mp4)

## black-hole-spin-sota — the same scene, run by frontier models 🎬

The exact black-hole-spin brief, but run by the **SOTA lineup** ([`config/models/sota-9.json`](../config/models/sota-9.json)):
Opus 4.8, Fable 5, Sonnet 5 through the local Claude CLI subscription; GPT-5.5 high and
GPT-5.4 high through the Codex CLI; plus GLM 5.2, Qwen3.7 Plus, Grok 4.3 and Kimi K2.7 Code.
A side-by-side of frontier models on the Gargantua scene — the strongest here produce clean
lensing halos and beamed disks. **[Grid video](black-hole-spin-sota/grid.mp4)** · per-model
clips in [`black-hole-spin-sota/clips/`](black-hole-spin-sota/clips). Config:
[`config/examples/black-hole-spin-sota.config.json`](../config/examples/black-hole-spin-sota.config.json).

[![black-hole-spin-sota — animated grid](black-hole-spin-sota/grid-anim.webp)](black-hole-spin-sota/grid.mp4)

## black-hole-css — the same spinning black hole, in pure CSS 🎬

The black-hole-spin scene with **no JavaScript, no canvas, no three.js** — a spinning
Gargantua (event horizon, edge-on accretion disk, lensing arcs, photon ring) built entirely
from HTML + CSS animations. A direct WebGL-vs-CSS comparison of the same brief. **[Grid
video](black-hole-css/grid.mp4)** · per-model clips in
[`black-hole-css/clips/`](black-hole-css/clips). Config:
[`config/examples/black-hole-css.config.json`](../config/examples/black-hole-css.config.json).

[![black-hole-css — animated grid](black-hole-css/grid-anim.webp)](black-hole-css/grid.mp4)

## pulsar-css — a pulsing pulsar in pure CSS 🎬

The one benchmark with **no JavaScript and no canvas** — a spinning neutron star (pulsing
core, rotating lighthouse beams, expanding shockwave rings) built entirely from HTML + CSS
animations. It isolates pure CSS-animation craft — no scripting, no canvas, no libraries.
CSS animations run on the browser's own timeline, so the harness pins every Web-Animations
timeline to its deterministic virtual clock (and waits for paint-commit) to capture the
clip reproducibly — same as the rAF-driven scenes. **[Grid video](pulsar-css/grid.mp4)** ·
per-model clips in [`pulsar-css/clips/`](pulsar-css/clips). Config:
[`config/examples/pulsar-css.config.json`](../config/examples/pulsar-css.config.json).

[![pulsar-css — animated grid](pulsar-css/grid-anim.webp)](pulsar-css/grid.mp4)

---

### Notes

- A model that errors, times out, or returns no HTML renders as a graceful "no output"
  placeholder (still labelled with its time) — the grid always builds. The `summary.json`
  and the web app record the exact reason.
- Generation caps reasoning effort (`reasoningEffort: "low"`) so hybrid-reasoning models
  don't burn the whole token budget "thinking" and return empty output, and transient
  provider stream errors are retried once. Remaining failures are genuinely
  provider/model-side and are reported honestly per model in each `summary.json`.
