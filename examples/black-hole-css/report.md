# black-hole-css

The spinning 'Gargantua' black hole built in pure HTML + CSS — no JavaScript, no canvas.

**Models:** 9 · **Rendered:** 9/9

## Prompt

Raw copyable version: [prompt.txt](./prompt.txt) · [system-prompt.txt](./system-prompt.txt)

> Build a spinning supermassive black hole — the 'Gargantua' look from the film Interstellar — as a full-screen scene in PURE CSS (no JavaScript, no canvas). A 5-second clip is captured and looped, so the rotation matters as much as the still.
> 
> START FROM THIS EXACT TEMPLATE. The skeleton, CSS reset, dark-space background, starfield, and the centered .blackhole box (sized to the event horizon) are ALREADY DONE — keep them exactly as given. Your only job is the black-hole rendering: write the CSS for the elements inside .blackhole and the rotation animation. Keep it TIGHT — a handful of gradients and shapes is plenty; do NOT write hundreds of lines.
> 
> ```html
> <!doctype html>
> <html>
> <head>
> <meta charset="utf-8">
> <style>
>   * { margin: 0; box-sizing: border-box; }
>   html, body { width: 100%; height: 100%; overflow: hidden; background: #03040a; }
>   .scene {
>     position: fixed; inset: 0; display: grid; place-items: center;
>     background: radial-gradient(120% 120% at 50% 50%, #0b0d16 0%, #03040a 62%);
>   }
>   /* Starfield — done; leave it as-is. */
>   .stars { position: absolute; inset: 0; opacity: .85;
>     background-image:
>       radial-gradient(1px 1px at 15% 22%, #fff, transparent),
>       radial-gradient(1px 1px at 68% 14%, #cbd5ff, transparent),
>       radial-gradient(1px 1px at 82% 61%, #fff, transparent),
>       radial-gradient(1px 1px at 34% 78%, #e6ecff, transparent),
>       radial-gradient(1px 1px at 52% 41%, #fff, transparent),
>       radial-gradient(1px 1px at 9% 66%, #cfd8ff, transparent),
>       radial-gradient(1px 1px at 91% 33%, #fff, transparent),
>       radial-gradient(1px 1px at 26% 9%, #fff, transparent),
>       radial-gradient(1px 1px at 74% 88%, #dfe6ff, transparent);
>   }
>   /* The black hole is centered here; its size = the event-horizon diameter (~30% of viewport height). */
>   .blackhole { position: relative; width: 30vh; height: 30vh; }
> 
>   /* ==================== YOUR CSS BELOW ==================== */
>   /* Style the elements inside .blackhole and animate the disk's rotation —
>      exactly ONE full turn over the 5s clip so it loops seamlessly. */
> 
> </style>
> </head>
> <body>
>   <div class="scene">
>     <div class="stars"></div>
>     <div class="blackhole">
>       <!-- Style these (add or rename as you need): -->
>       <div class="disk"></div>         <!-- bright accretion disk, viewed edge-on -->
>       <div class="lensing"></div>      <!-- lensing halo: arcs over the top and mirrored under the bottom -->
>       <div class="horizon"></div>      <!-- the solid-black event-horizon sphere -->
>       <div class="photon-ring"></div>  <!-- thin bright ring hugging the horizon edge -->
>     </div>
>   </div>
> </body>
> </html>
> ```
> 
> Render this exact composition (everything centered, frame fixed):
> - horizon: a solid-black disc filling .blackhole, with a crisp edge.
> - disk: a bright accretion disk seen nearly EDGE-ON — a wide, flattened bright band crossing the middle of the black disc and extending well past it on both sides (roughly 2.5x wider than the horizon). Hot white-yellow on the inner edge fading outward to amber then deep orange (#fff3d0 -> #ffae3b -> #c8551a). Make one side slightly brighter (relativistic beaming).
> - lensing: the signature halo — bright arcs bending UP and OVER the top of the horizon AND mirrored UNDER the bottom (not just a flat band).
> - photon-ring: a thin, bright ring hugging the very edge of the horizon.
> - Background stays near-black with the faint static starfield from the template (do not animate the stars).
> 
> Motion (the point of this benchmark — must read clearly and loop seamlessly in 5s):
> - Give the disk visible azimuthal structure (brightness clumps, streaks, or banding — a conic-gradient works well) and ROTATE it EXACTLY one full turn over the 5-second clip. A featureless band would look static.
> - Optional subtle shimmer on the disk and lensing arcs. The frame stays fixed; keep the black hole centered and the disk horizontal.
> 
> Return the COMPLETE HTML document — the template with your CSS filled in — and nothing else.

## Grid

![grid](./grid.png)

▶ **Animated:** [grid.mp4](./grid.mp4) — per-model clips in `models/<slug>/clip.mp4`.

## Results

| Model | ID | Provider | Status | Time | Tokens | Note |
|-------|----|----------|--------|------|--------|------|
| GLM 5.2 | `z-ai/glm-5.2` | openrouter | ✅ rendered | 229.6s | 15120 |  |
| Grok 4.3 | `x-ai/grok-4.3` | openrouter | ✅ rendered | 20.7s | 3233 |  |
| GPT-5.4 mini | `openai/gpt-5.4-mini` | openrouter | ✅ rendered | 13.6s | 3443 |  |
| Claude Haiku 4.5 | `anthropic/claude-haiku-4.5` | openrouter | ✅ rendered | 28.6s | 6130 |  |
| Qwen3.7 Plus | `qwen/qwen3.7-plus` | openrouter | ✅ rendered | 713.3s | 28651 |  |
| Gemini 3.1 Flash-Lite | `google/gemini-3.1-flash-lite` | openrouter | ✅ rendered | 4.6s | 2823 |  |
| DeepSeek V4 Pro | `deepseek/deepseek-v4-pro` | openrouter | ✅ rendered | 361.1s | 19104 |  |
| Kimi K2.7 Code | `moonshotai/kimi-k2.7-code` | openrouter | ✅ rendered | 270.2s | 11569 |  |
| Kimi K2.6 | `moonshotai/kimi-k2.6` | openrouter | ✅ rendered | 687.6s | 30563 |  |

Per-model artifacts live in `models/<slug>/` (`raw.txt`, `output.html`, `screenshot.png`, `result.json`).
