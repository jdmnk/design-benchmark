# black-hole-spin

Animated version of the black-hole benchmark: a 5-second clip of the spinning accretion disk is captured frame-by-frame on the deterministic virtual clock, then composed into one grid video (grid.mp4).

**Models:** 9 · **Rendered:** 5/9

## Prompt

> Render a realistic supermassive black hole — the 'Gargantua' look from the film Interstellar — as a full-screen three.js scene (100vw × 100vh, auto-starting, no user interaction). A 5-SECOND CLIP of the scene is captured, so the motion matters as much as the still composition.
> 
> Composition (match exactly so results are comparable):
> - The black hole (event horizon) is a perfectly black sphere centered in the frame, its diameter about 28% of the viewport height.
> - A bright, thin accretion disk lies in a HORIZONTAL plane around the sphere and is viewed nearly edge-on: the camera sits only about 5–8 degrees above the disk plane, so the disk reads as a near-horizontal bright band cutting across the sphere's middle and extending well past it on both sides.
> - Gravitational lensing: the far side of the disk appears bent UP and OVER the top of the black sphere AND mirrored UNDER the bottom, forming the signature bright halo arcs above and below the horizon (not merely a flat ring). Approximate this with extra bright arcs wrapping over and under the sphere (partial ring/torus geometry works well).
> - A thin, bright photon ring hugs the very edge of the black sphere.
> - Disk coloring: hot white-yellow on the inner edge fading outward to amber then deep orange (#fff3d0 → #ffae3b → #c8551a). Make one side of the disk slightly brighter than the other (relativistic beaming).
> - Background: near-black space with a sparse, dim starfield.
> 
> Motion (the point of this benchmark — must be clearly visible within the 5-second clip):
> - The accretion disk rotates around the black hole at roughly 25–40 degrees per second, so a recognizable feature travels a quarter to half a revolution during the clip. Give the disk visible azimuthal structure (brightness clumps, streaks, or turbulent bands) so the rotation reads clearly — a featureless ring would look static.
> - Add subtle shimmering/flicker in the disk and lensing arcs, and slow drift in the beaming highlight. The camera stays FIXED.
> 
> Keep the black hole centered and the disk horizontal. Return ONLY a single complete HTML document.

## Grid

![grid](./grid.png)

▶ **Animated:** [grid.mp4](./grid.mp4) — per-model clips in `models/<slug>/clip.mp4`.

## Results

| Model | ID | Provider | Status | Time | Tokens | Note |
|-------|----|----------|--------|------|--------|------|
| GLM 5.2 | `z-ai/glm-5.2` | openrouter | ✅ rendered | 552.9s | 12607 |  |
| GLM 5.1 | `z-ai/glm-5.1` | openrouter | ❌ error | 412.8s | — | Unexpected end of JSON input |
| GPT-5.4 mini | `openai/gpt-5.4-mini` | openrouter | ⬛ blank | 32.4s | 5991 |  |
| Claude Haiku 4.5 | `anthropic/claude-haiku-4.5` | openrouter | ✅ rendered | 34.9s | 7885 |  |
| Qwen3.7 Plus | `qwen/qwen3.7-plus` | openrouter | ✅ rendered | 525.2s | 6562 |  |
| Gemini 3.1 Flash-Lite | `google/gemini-3.1-flash-lite` | openrouter | ✅ rendered | 5.5s | 2642 |  |
| DeepSeek V4 Pro | `deepseek/deepseek-v4-pro` | openrouter | ✅ rendered | 336.7s | 24931 |  |
| MiMo v2.5 | `xiaomi/mimo-v2.5` | openrouter | ❌ error | 606.7s | — | Empty completion (hit token limit before producing output). Raw: {"id":"gen-1782 |
| MiniMax M3 | `minimax/minimax-m3` | openrouter | ❌ error | 730.9s | — | Empty completion (hit token limit before producing output). Raw: {"id":"gen-1782 |

Per-model artifacts live in `models/<slug>/` (`raw.txt`, `output.html`, `screenshot.png`, `result.json`).
