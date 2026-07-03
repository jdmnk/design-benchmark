# sunset-svg

A single inline-SVG sunset scene: sun setting behind a mountain range, with clouds and a river. Prescriptive composition so outputs are directly comparable.

**Models:** 9 · **Rendered:** 9/9

## Prompt

Raw copyable version: [prompt.txt](./prompt.txt) · [system-prompt.txt](./system-prompt.txt)

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
| GLM 5.2 | `z-ai/glm-5.2` | openrouter | ✅ rendered | 68.5s | 5188 |  |
| Grok 4.3 | `x-ai/grok-4.3` | openrouter | ✅ rendered | 15.1s | 2568 |  |
| GPT-5.4 mini | `openai/gpt-5.4-mini` | openrouter | ✅ rendered | 21.1s | 3756 |  |
| Claude Haiku 4.5 | `anthropic/claude-haiku-4.5` | openrouter | ✅ rendered | 31.0s | 5789 |  |
| Qwen3.7 Plus | `qwen/qwen3.7-plus` | openrouter | ✅ rendered | 84.9s | 5071 |  |
| Gemini 3.1 Flash-Lite | `google/gemini-3.1-flash-lite` | openrouter | ✅ rendered | 5.2s | 2028 |  |
| DeepSeek V4 Pro | `deepseek/deepseek-v4-pro` | openrouter | ✅ rendered | 396.4s | 3183 |  |
| Kimi K2.6 | `moonshotai/kimi-k2.6` | openrouter | ✅ rendered | 21.4s | 4061 |  |
| Mistral Small 4 | `mistralai/mistral-small-2603` | openrouter | ✅ rendered | 32.8s | 7090 |  |

Per-model artifacts live in `models/<slug>/` (`raw.txt`, `output.html`, `screenshot.png`, `result.json`).
