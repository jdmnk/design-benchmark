# black-hole

Realistic supermassive black hole ('Gargantua' from Interstellar) in three.js/WebGL. Prescriptive composition so outputs are directly comparable. Deterministic captured frame.

**Models:** 9 · **Rendered:** 5/9

## Prompt

> Render a realistic supermassive black hole — the 'Gargantua' look from the film Interstellar — as a full-screen three.js scene. Match this exact composition so results are comparable:
> 
> - The black hole (event horizon) is a perfectly black sphere centered in the frame, its diameter about 28% of the viewport height.
> - A bright, thin accretion disk lies in a HORIZONTAL plane around the sphere and is viewed nearly edge-on: the camera sits only about 5–8 degrees above the disk plane, so the disk reads as a near-horizontal bright band cutting across the sphere's middle and extending well past it on both sides.
> - Gravitational lensing: the far side of the disk appears bent UP and OVER the top of the black sphere AND mirrored UNDER the bottom, forming the signature bright halo arcs above and below the horizon (not merely a flat ring). Approximate this with extra bright arcs wrapping over and under the sphere.
> - A thin, bright photon ring hugs the very edge of the black sphere.
> - Disk coloring: hot white-yellow on the inner edge fading outward to amber then deep orange (#fff3d0 → #ffae3b → #c8551a). Make one side of the disk slightly brighter than the other (relativistic beaming).
> - Background: near-black space with a sparse, dim starfield. The disk rotates slowly.
> 
> Keep the black hole centered and the disk horizontal. Return ONLY a single complete HTML document.

## Grid

![grid](./grid.png)

## Results

| Model | ID | Provider | Status | Time | Tokens | Note |
|-------|----|----------|--------|------|--------|------|
| GLM 5.2 | `z-ai/glm-5.2` | openrouter | ❌ error | 231.7s | — | Empty completion. Raw: {"id":"gen-1782846341-oWpp9xzXO4vL8u1hTJIT","object":"cha |
| GLM 5.1 | `z-ai/glm-5.1` | openrouter | ❌ error | 300.0s | — | This operation was aborted |
| GPT-5.4 mini | `openai/gpt-5.4-mini` | openrouter | ✅ rendered | 13.0s | 2823 |  |
| Claude Haiku 4.5 | `anthropic/claude-haiku-4.5` | openrouter | ✅ rendered | 11.9s | 3151 |  |
| Qwen3.7 Plus | `qwen/qwen3.7-plus` | openrouter | ✅ rendered | 106.5s | 6277 |  |
| Gemini 3.1 Flash-Lite | `google/gemini-3.1-flash-lite` | openrouter | ✅ rendered | 4.8s | 1711 |  |
| DeepSeek V4 Pro | `deepseek/deepseek-v4-pro` | openrouter | ✅ rendered | 55.3s | 4897 |  |
| MiMo v2.5 | `xiaomi/mimo-v2.5` | openrouter | ❌ error | 300.0s | — | This operation was aborted |
| MiniMax M3 | `minimax/minimax-m3` | openrouter | ❌ error | 133.0s | — | Empty completion. Raw: {"id":"gen-1782846341-Jwkiwa4aWMMev0gnb1Pj","object":"cha |

Per-model artifacts live in `models/<slug>/` (`raw.txt`, `output.html`, `screenshot.png`, `result.json`).
