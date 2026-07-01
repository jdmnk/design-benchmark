# sunset-svg

A single inline-SVG sunset scene: sun setting behind a mountain range, with clouds and a river. Prescriptive composition so outputs are directly comparable.

**Models:** 9 · **Rendered:** 9/9

## Prompt

> Illustrate a serene sunset landscape as a single inline SVG. Match this composition so results are comparable:
> 
> - Sky fills the top ~55% of the scene: a smooth vertical sunset gradient, deep blue/indigo at the very top, through magenta/pink, to warm orange/gold near the horizon.
> - The sun is a soft glowing circle sitting LOW on the horizon, centered horizontally (about 50% width) and positioned just above and slightly behind the tallest mountain peak.
> - A layered mountain range as silhouettes across the middle of the scene: 2–3 overlapping ridgelines, each darker/closer toward the front, with the tallest peak near the center directly in front of the sun.
> - A few soft, elongated clouds in the upper sky, tinted warm by the sunset.
> - A river in the foreground (bottom ~20%) widening as it flows toward the viewer from the base of the mountains, reflecting the sun as a vertical shimmer of warm light down its center.
> 
> Smooth gradients, clean layered vector shapes, a cohesive warm palette, clear depth. Optionally add subtle ambient motion (slowly drifting clouds or a shimmering reflection). It is JUST the scene — no text, no UI, no border. Return ONLY a single complete HTML document.

## Grid

![grid](./grid.png)

## Results

| Model | ID | Provider | Status | Time | Tokens | Note |
|-------|----|----------|--------|------|--------|------|
| GLM 5.2 | `z-ai/glm-5.2` | openrouter | ✅ rendered | 161.9s | 9190 |  |
| GLM 5.1 | `z-ai/glm-5.1` | openrouter | ✅ rendered | 229.7s | 14053 |  |
| GPT-5.4 mini | `openai/gpt-5.4-mini` | openrouter | ✅ rendered | 20.0s | 3175 |  |
| Claude Haiku 4.5 | `anthropic/claude-haiku-4.5` | openrouter | ✅ rendered | 16.8s | 3213 |  |
| Qwen3.7 Plus | `qwen/qwen3.7-plus` | openrouter | ✅ rendered | 61.4s | 3761 |  |
| Gemini 3.1 Flash-Lite | `google/gemini-3.1-flash-lite` | openrouter | ✅ rendered | 5.6s | 2006 |  |
| DeepSeek V4 Pro | `deepseek/deepseek-v4-pro` | openrouter | ✅ rendered | 181.2s | 9040 |  |
| MiMo v2.5 | `xiaomi/mimo-v2.5` | openrouter | ✅ rendered | 169.9s | 7146 |  |
| MiniMax M3 | `minimax/minimax-m3` | openrouter | ✅ rendered | 113.7s | 12829 |  |

Per-model artifacts live in `models/<slug>/` (`raw.txt`, `output.html`, `screenshot.png`, `result.json`).
