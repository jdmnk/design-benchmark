# festival-landing

Landing page for a fictional electronic-music festival. The content is fixed so outputs are comparable; the art direction is deliberately wide open — this brief exists to expose each model's design sensibility, not its ability to follow a template.

**Models:** 9 · **Rendered:** 8/9

## Prompt

> Design the landing page for «EMBERWAVE» — a fictional 3-day electronic music festival held in a desert canyon, June 18–20 2027. This is a DESIGN benchmark: make it look like a real festival site people would screenshot and share. Bold, expressive, atmospheric — pick a strong visual concept (psychedelic, brutalist rave, retro-futurist, cosmic desert — your call) and commit to it fully. Generic corporate layouts will score poorly.
> 
> Required content, all visible within the top ~800px (dense toward the top; the page is captured as a fixed-height crop):
> 1. The festival name «EMBERWAVE» as a dominant typographic statement — treat the wordmark itself as art.
> 2. Date and place: June 18–20, 2027 · Ash Canyon, Nevada.
> 3. A 'Get tickets' call-to-action that fits the art direction.
> 4. A headliner lineup of exactly these six fictional acts, with clear visual hierarchy (headliners bigger): NOVA CULT, Velvet Static, MOONBURN, Dax Riviera, Cinder & Ash, The Glass Dunes.
> 5. A small marquee/ticker or badge announcing 'Phase 2 lineup — March 2027'.
> 
> Use expressive typography (Google Fonts allowed), layered CSS/SVG shapes, gradients, texture, and (optionally) subtle CSS animation. No stock-photo look — build the atmosphere from code. Return ONLY a single complete HTML document.

## Grid

![grid](./grid.png)

## Results

| Model | ID | Provider | Status | Time | Tokens | Note |
|-------|----|----------|--------|------|--------|------|
| GLM 5.2 | `z-ai/glm-5.2` | openrouter | ✅ rendered | 342.8s | 14079 |  |
| GLM 5.1 | `z-ai/glm-5.1` | openrouter | ❌ error | 840.0s | — | This operation was aborted |
| GPT-5.4 mini | `openai/gpt-5.4-mini` | openrouter | ✅ rendered | 18.5s | 3842 |  |
| Claude Haiku 4.5 | `anthropic/claude-haiku-4.5` | openrouter | ✅ rendered | 32.1s | 6185 |  |
| Qwen3.7 Plus | `qwen/qwen3.7-plus` | openrouter | ✅ rendered | 123.3s | 7084 |  |
| Gemini 3.1 Flash-Lite | `google/gemini-3.1-flash-lite` | openrouter | ✅ rendered | 6.9s | 2479 |  |
| DeepSeek V4 Pro | `deepseek/deepseek-v4-pro` | openrouter | ✅ rendered | 208.1s | 14400 |  |
| MiMo v2.5 | `xiaomi/mimo-v2.5` | openrouter | ✅ rendered | 126.8s | 9482 |  |
| MiniMax M3 | `minimax/minimax-m3` | openrouter | ✅ rendered | 328.4s | 16832 |  |

Per-model artifacts live in `models/<slug>/` (`raw.txt`, `output.html`, `screenshot.png`, `result.json`).
