# analytics-dashboard

A second example run: a denser UI brief, a 2-column grid, viewport-only screenshots, and a mix of OpenRouter + native providers.

**Models:** 4 · **Rendered:** 4/4

## Prompt

> Design a dark-mode analytics dashboard for a fictional product 'Pulse'. Include a left sidebar nav, a top bar with search and user avatar, a row of 4 KPI stat cards, a large line chart placeholder, a bar chart placeholder, and a recent-activity table. Use a refined, modern data-app aesthetic. Return ONLY a single complete HTML document.

## Grid

![grid](./grid.png)

## Results

| Model | ID | Provider | Status | Time | Tokens | Note |
|-------|----|----------|--------|------|--------|------|
| Claude Haiku 4.5 | `anthropic/claude-haiku-4.5` | openrouter | ✅ html | 34.4s | 8373 |  |
| GPT-5 nano | `openai/gpt-5-nano` | openrouter | ✅ html | 71.1s | 9821 |  |
| Gemini 2.5 Flash | `google/gemini-2.5-flash` | openrouter | ✅ html | 29.5s | 5712 |  |
| DeepSeek V3.1 | `deepseek/deepseek-chat-v3.1` | openrouter | ✅ html | 184.9s | 5148 |  |

Per-model artifacts live in `models/<slug>/` (`raw.txt`, `output.html`, `screenshot.png`, `result.json`).
