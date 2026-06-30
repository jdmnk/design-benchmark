# saas-landing-page

Single-prompt visual design benchmark. Every model designs the same page; we screenshot each render and tile them into a grid.

**Models:** 6 · **Rendered:** 6/6

## Prompt

> Design a landing page for a fictional SaaS product called "Nimbus" — an AI note-taking app. Include a hero section with a headline, subheadline and call-to-action, a 3-column features section, a testimonial, a pricing teaser, and a footer. Use a cohesive color palette, good typography, spacing, and visual hierarchy. Make it look like a premium real product. Return ONLY a single complete HTML document.

## Grid

![grid](./grid.png)

## Results

| Model | ID | Provider | Status | Time | Tokens | Note |
|-------|----|----------|--------|------|--------|------|
| Claude Haiku 4.5 | `anthropic/claude-haiku-4.5` | openrouter | ✅ html | 30.3s | 7418 |  |
| GPT-4o mini | `openai/gpt-4o-mini` | openrouter | ✅ html | 16.6s | 1178 |  |
| Gemini 2.5 Flash | `google/gemini-2.5-flash` | openrouter | ✅ html | 33.0s | 6860 |  |
| DeepSeek V3.1 | `deepseek/deepseek-chat-v3.1` | openrouter | ✅ html | 139.4s | 3582 |  |
| Llama 3.3 70B | `meta-llama/llama-3.3-70b-instruct` | openrouter | ✅ html | 56.8s | 1445 |  |
| Qwen3 Coder | `qwen/qwen3-coder` | openrouter | ✅ html | 58.7s | 4242 |  |

Per-model artifacts live in `models/<slug>/` (`raw.txt`, `output.html`, `screenshot.png`, `result.json`).
