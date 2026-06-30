# Examples

Real runs of Design Bench. Every example uses the **same 9 models** — a consistent
lineup of cheap-but-modern models from the major labs (see
[`config/models/standard-9.json`](../config/models/standard-9.json)):

> Claude Haiku 4.5 · GPT-5.4 nano · GPT-OSS 120B · Gemini 2.5 Flash · GLM 4.7 Flash · DeepSeek V3.2 · Qwen3 Coder Flash · Kimi K2.5 · Mistral Small 3.2

Each folder has the `grid.png` (the deliverable), a `report.md`, and a `summary.json`
(per-model time + tokens). Each grid cell is labelled with the model name and its
**time-to-completion + output tokens**. Reproduce any of them with:

```bash
npm run bench -- --config config/examples/<name>.config.json
```

These runs are deterministic where it matters: animation examples seed `Math.random`
and step a virtual clock, so re-running produces the **same frame** (verified
pixel-identical for both Canvas2D and WebGL).

---

## threejs-orb — 3D / WebGL

Each model writes a full-screen three.js scene of a glowing orb. Models `import * as THREE from 'three'`
and pull in add-ons (`three/addons/...`) naturally — the local render server resolves
them from a pinned, vendored copy. The actual generated HTML is in
[`threejs-orb/pages/`](threejs-orb/pages) — open any of them.

![threejs-orb](threejs-orb/grid.png)

## svg-poster — vector art

Each model hand-codes a single inline `<svg>` poster. Bold typography, layered gradients,
ambient animation. Source SVGs in [`svg-poster/pages/`](svg-poster/pages).

![svg-poster](svg-poster/grid.png)

## particle-flow — Canvas 2D

A full-screen animated particle flow field, plain Canvas + requestAnimationFrame, no
libraries. Frame-stepped deterministically so the captured frame is reproducible.

![particle-flow](particle-flow/grid.png)

## css-cosmos — pure CSS

No JS, no images — an animated cosmic scene with HTML + CSS only.

![css-cosmos](css-cosmos/grid.png)

## saas-landing-page — "website" mode

The other rendering mode: full-page screenshots with caption banners instead of overlay
labels. Six… nine models design the same SaaS landing page. Real generated HTML in
[`saas-landing-page/pages/`](saas-landing-page/pages).

![saas-landing-page](saas-landing-page/grid.png)

---

### Notes from these runs

- All on cheap models — a full 9-model creative run is a few cents.
- Cells render full-bleed and are cropped to a fixed dense top (fixed viewport, not full
  page), so the grid stays tidy regardless of how each model laid things out.
- A model that errors, times out, or returns no HTML renders as a graceful "no output"
  placeholder (still labelled with its time) — the grid always builds. You can see this
  on Kimi K2.5 in css-cosmos, which exceeded the time budget.
