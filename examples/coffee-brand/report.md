# coffee-brand

A visually expressive brief on the ultra-cheap / budget tier — can small models still produce a bold, characterful design? 3-column full-page grid.

**Models:** 6 · **Rendered:** 6/6

## Prompt

> Design a striking single-page website for a fictional artisanal coffee brand called 'Ember'. Include a full-bleed hero with the brand name, an evocative tagline and a 'Shop beans' call-to-action, a short brand story section, a 3-up grid of signature roasts with names and tasting notes, and a footer with newsletter signup. Use a warm, premium palette and confident typography. Return ONLY a single complete HTML document.

## Grid

![grid](./grid.png)

## Results

| Model | ID | Provider | Status | Time | Tokens | Note |
|-------|----|----------|--------|------|--------|------|
| Mistral Nemo | `mistralai/mistral-nemo` | openrouter | ✅ html | 48.7s | 1282 |  |
| Mistral Small 3.2 | `mistralai/mistral-small-3.2-24b-instruct` | openrouter | ✅ html | 25.2s | 1671 |  |
| Amazon Nova Lite | `amazon/nova-lite-v1` | openrouter | ✅ html | 5.5s | 1259 |  |
| Gemini 2.5 Flash-Lite | `google/gemini-2.5-flash-lite` | openrouter | ✅ html | 10.7s | 2817 |  |
| GPT-5 nano | `openai/gpt-5-nano` | openrouter | ✅ html | 53.0s | 7585 |  |
| Llama 3.3 70B | `meta-llama/llama-3.3-70b-instruct` | openrouter | ✅ html | 6.0s | 1317 |  |

Per-model artifacts live in `models/<slug>/` (`raw.txt`, `output.html`, `screenshot.png`, `result.json`).
