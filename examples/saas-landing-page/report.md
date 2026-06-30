# saas-landing-page

Single-prompt visual design benchmark. Every model designs the same page; we screenshot each render and tile them into a grid.

**Models:** 9 · **Rendered:** 9/9

## Prompt

> Design a landing page for a fictional SaaS product called "Nimbus" — an AI note-taking app. Include a hero section with a headline, subheadline and call-to-action, a 3-column features section, a testimonial, a pricing teaser, and a footer. Use a cohesive color palette, good typography, spacing, and visual hierarchy. Make it look like a premium real product. Return ONLY a single complete HTML document.

## Grid

![grid](./grid.png)

## Results

| Model | ID | Provider | Status | Time | Tokens | Note |
|-------|----|----------|--------|------|--------|------|
| Claude Haiku 4.5 | `anthropic/claude-haiku-4.5` | openrouter | ✅ html | 28.5s | 6659 |  |
| GPT-5.4 nano | `openai/gpt-5.4-nano` | openrouter | ✅ html | 79.8s | 8140 |  |
| GPT-OSS 120B | `openai/gpt-oss-120b` | openrouter | ✅ html | 69.3s | 2985 |  |
| Gemini 2.5 Flash | `google/gemini-2.5-flash` | openrouter | ✅ html | 28.8s | 5638 |  |
| GLM 4.7 Flash | `z-ai/glm-4.7-flash` | openrouter | ✅ html | 94.2s | 8092 |  |
| DeepSeek V3.2 | `deepseek/deepseek-v3.2` | openrouter | ✅ html | 193.9s | 6205 |  |
| Qwen3 Coder Flash | `qwen/qwen3-coder-flash` | openrouter | ✅ html | 40.2s | 4790 |  |
| Kimi K2.5 | `moonshotai/kimi-k2.5` | openrouter | ✅ html | 144.0s | 7708 |  |
| Mistral Small 3.2 | `mistralai/mistral-small-3.2-24b-instruct` | openrouter | ✅ html | 124.4s | 3723 |  |

Per-model artifacts live in `models/<slug>/` (`raw.txt`, `output.html`, `screenshot.png`, `result.json`).
