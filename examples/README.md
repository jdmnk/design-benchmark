# Examples

Real runs of Design Bench. There's also a **showcase web app** that presents these with
the prompts and per-model metadata — see [`web/`](../web).

Every example uses the **same 9 models** (see
[`config/models/standard-9.json`](../config/models/standard-9.json)):

> GLM 5.2 · GLM 5.1 · GPT-5.4 mini · Claude Haiku 4.5 · Qwen3.7 Plus · Gemini 3.1 Flash-Lite · DeepSeek V4 Pro · MiMo v2.5 · MiniMax M3

Each folder has the `grid.png` (the deliverable), a `report.md`, a `summary.json`
(per-model time + tokens + status), and `pages/` (the actual HTML each model produced —
open them in a browser). Each grid cell carries a thin top-bar label: model name · time ·
output tokens. Reproduce any with:

```bash
npm run bench                                                  # saas-swiss (default)
npm run bench -- --config config/examples/black-hole.config.json
npm run bench -- --config config/examples/sunset-svg.config.json
```

The prompts are deliberately **detailed and prescriptive** so the comparison is about
execution, not interpretation.

---

## saas-swiss — Swiss / International Typographic Style landing page

A precise brief (MERIDIAN, a data-analytics SaaS) in strict Swiss style — Helvetica grid,
one signal-red accent, numbered feature columns — packed densely toward the top and
captured as a fixed crop. Config: [`config/benchmark.config.json`](../config/benchmark.config.json).

![saas-swiss](saas-swiss/grid.png)

## black-hole — Interstellar "Gargantua" in three.js / WebGL

A hard, very prescriptive 3D brief: black event-horizon sphere, near-edge-on accretion
disk, gravitational-lensing halo arcs, photon ring, specific colors and camera. It
discriminates sharply — several slower/reasoning models time out or exhaust tokens before
answering (visible in the per-model table). Config:
[`config/examples/black-hole.config.json`](../config/examples/black-hole.config.json).

![black-hole](black-hole/grid.png)

## sunset-svg — a single inline-SVG scene

Sun setting behind a layered mountain range, with clouds and a reflecting river — exact
composition specified so outputs line up. Pure hand-coded vector art, no libraries.
Config: [`config/examples/sunset-svg.config.json`](../config/examples/sunset-svg.config.json).

![sunset-svg](sunset-svg/grid.png)

---

### Notes

- A model that errors, times out, or returns no HTML renders as a graceful "no output"
  placeholder (still labelled with its time) — the grid always builds. The `summary.json`
  and the web app record the exact reason.
- The black-hole and sunset briefs are intentionally hard; the same few reasoning-heavy
  models (GLM 5.1, MiMo v2.5, MiniMax M3, DeepSeek V4 Pro) repeatedly time out or return
  empty completions on them, while GPT-5.4 mini, Claude Haiku 4.5, Qwen3.7 Plus, Gemini
  3.1 Flash-Lite and GLM 5.2 are the consistent finishers.
