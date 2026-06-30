# Design Bench

A **visual design benchmark for LLMs**. You give one design brief; many models each
produce a complete HTML page; we render every page in a headless browser, screenshot
it, and tile the screenshots into a single **side-by-side grid PNG** so you can eyeball
which model designs best.

![example grid](docs/example-grid.png)

> A real run: six cheap models (Claude Haiku 4.5, GPT-4o mini, Gemini 2.5 Flash, DeepSeek
> V3.1, Llama 3.3 70B, Qwen3 Coder) each designing the same landing page. See
> **[`examples/`](examples/)** for this and two more runs (a dark-mode dashboard and a
> budget-tier brand site), including the actual HTML each model produced.

---

## Goal

Most LLM benchmarks score text or code with automated metrics. Design quality is
visual and subjective — the fastest way to judge it is to **look at the outputs next to
each other**. Design Bench optimises for exactly that:

1. **One prompt, many models** — the comparison is apples-to-apples by construction.
2. **Real renders, not code diffs** — we run the model's HTML in Chromium and screenshot
   what a user would actually see.
3. **One artifact to judge** — a single grid image (3 per row by default) is the whole
   point; everything else is plumbing.

It is deliberately small and hackable. The structure and execution model mimic existing
config-driven LLM benchmarks (e.g. [`akitaonrails/llm-coding-benchmark`](https://github.com/akitaonrails/llm-coding-benchmark)
— a `config/models.json` registry routed through OpenRouter's OpenAI-compatible API) and
visual front-end benchmarks (e.g. [`WebPAI/DesignBench`](https://github.com/webpai/designbench)
— generate code, render it in a browser, screenshot for comparison). We borrow those
conventions and build our own benchmark on top.

---

## How it works

A run is four stages, executed in order. Each writes artifacts to disk, so any later
stage can be re-run on its own.

```
config ──▶ ① generate ──▶ ② render ──▶ ③ grid ──▶ ④ report
            (LLM API)      (Chromium)    (sharp)     (markdown)
```

1. **generate** — Send `systemPrompt` + `prompt` to every model (in parallel, with a
   concurrency cap). Extract the HTML document from each reply and save it.
2. **render** — Open each `output.html` in headless Chromium at a fixed viewport and take
   a PNG screenshot (full-page by default, height-clamped so nothing is absurdly tall).
3. **grid** — Scale every screenshot to a fixed cell width, add a label caption with the
   model name, and composite them into one grid image, N columns wide.
4. **report** — Write a `report.md` (status table + embedded grid) and a `summary.json`.

### The config is the run

Everything about a run lives in one JSON file (default
[`config/benchmark.config.json`](config/benchmark.config.json)) — the prompt, the system
prompt, which models, render settings, and grid layout. To run a different benchmark,
write a different config. See [`config/examples/dashboard.config.json`](config/examples/dashboard.config.json)
for a second one (different prompt, 2-column grid, viewport-only screenshots).

```jsonc
{
  "name": "saas-landing-page",          // → results/saas-landing-page/
  "systemPrompt": "You are a world-class product designer...",
  "prompt": "Design a landing page for a fictional SaaS product...",
  "render": { "viewportWidth": 1280, "fullPage": true, "maxFullPageHeight": 4000 },
  "grid":   { "columns": 3, "cellWidth": 640, "title": "Design Bench — saas-landing-page" },
  "generation": { "temperature": 0.7, "maxTokens": 8000, "concurrency": 4, "retries": 1 },
  "models": [
    { "slug": "claude-opus-4.8", "label": "Claude Opus 4.8", "provider": "openrouter", "id": "anthropic/claude-opus-4.1" },
    { "slug": "gpt-5",           "label": "GPT-5",           "provider": "openrouter", "id": "openai/gpt-5" }
    // ...
  ]
}
```

A [JSON schema](config/schema.json) is wired in via `$schema`, so editors give you
autocomplete and validation.

---

## Providers

Calls go through **OpenRouter** by default — it's a single API and key for ~all models,
which is why it's the primary backend. Because the industry standardised on the OpenAI
`/chat/completions` wire format, the same client code also talks to any OpenAI-compatible
endpoint, and a native Anthropic provider is included too.

Set a model's `provider` field to one of:

| `provider`   | Backend                                   | Env vars |
|--------------|-------------------------------------------|----------|
| `openrouter` | OpenRouter (default, recommended)         | `OPENROUTER_API_KEY` |
| `openai`     | OpenAI **or** any OpenAI-compatible host  | `OPENAI_API_KEY`, optional `OPENAI_BASE_URL` (Together, Groq, vLLM, LM Studio, …) |
| `anthropic`  | Anthropic Messages API directly           | `ANTHROPIC_API_KEY` |

You only need a key for the providers your config actually uses. Model `id`s are
provider-specific — on OpenRouter they look like `anthropic/claude-opus-4.1` or
`openai/gpt-5` (browse them at <https://openrouter.ai/models>).

---

## Setup

Requires Node 20+.

```bash
npm install                 # installs deps + downloads Chromium (Playwright)
cp .env.example .env        # then add your OPENROUTER_API_KEY
```

Headless Chromium needs some system libraries. The standard way to install them:

```bash
sudo npx playwright install-deps chromium
```

**No sudo?** Use the included rootless helper — it downloads and extracts the libs +
fonts into a local `.runtime/` folder (no root) and writes an env file to source:

```bash
bash scripts/setup-browser-deps.sh
source .runtime/env.sh
```

---

## Run

```bash
# Full pipeline (generate → render → grid → report)
npm run bench

# A different config (see examples/ for the outputs of these)
npm run bench -- --config config/examples/dashboard.config.json
npm run bench -- --config config/examples/coffee-brand.config.json

# Only some models (by slug), repeatable / comma-separated
npm run bench -- --model claude-opus-4.8 --model gpt-5

# Re-run a single stage using artifacts already on disk
npm run bench -- --stage render
npm run bench -- --stage grid

# Try the whole pipeline with NO API calls (placeholder pages) — great first smoke test
npm run bench -- --dry-run
```

CLI flags: `--config/-c`, `--stage/-s` (`all|generate|render|grid|report`),
`--model/-m`, `--dry-run`, `--help/-h`.

---

## Output layout

```
results/<run-name>/
├── grid.png                  ← the side-by-side comparison (the deliverable)
├── report.md                 ← status table + embedded grid
├── summary.json              ← machine-readable run summary
└── models/<slug>/
    ├── raw.txt               ← the model's full raw reply
    ├── output.html           ← HTML extracted from the reply (what gets rendered)
    ├── screenshot.png        ← Chromium screenshot of output.html
    └── result.json           ← status, timing, token usage
```

---

## Project structure

```
design-bench/
├── config/
│   ├── benchmark.config.json     # the default run (edit this)
│   ├── schema.json               # JSON schema for configs
│   └── examples/dashboard.config.json
├── scripts/
│   └── setup-browser-deps.sh     # rootless Chromium deps installer
├── src/
│   ├── run.ts                    # CLI entry / orchestrator
│   ├── config.ts                 # load, validate, defaults, --model filtering
│   ├── generate.ts               # stage ①: query models, extract + save HTML
│   ├── render.ts                 # stage ②: Chromium screenshots (Playwright)
│   ├── grid.ts                   # stage ③: composite the grid (sharp)
│   ├── report.ts                 # stage ④: report.md + summary.json
│   ├── html.ts                   # pull an HTML doc out of a messy reply
│   ├── paths.ts                  # on-disk layout for a run
│   ├── types.ts                  # shared types
│   └── providers/
│       ├── index.ts              # provider registry (reads env keys)
│       ├── openaiCompatible.ts   # OpenRouter + any OpenAI-compatible host
│       └── anthropic.ts          # native Anthropic Messages API
└── results/                      # generated artifacts (gitignored)
```

---

## Design choices & rationale

- **TypeScript + `tsx`.** Run the source directly, no build step. Strict mode on.
- **Plain `fetch`, no SDK.** One tiny OpenAI-compatible client covers OpenRouter, OpenAI,
  and the long tail of compatible hosts; Anthropic gets a ~30-line adapter. Fewer deps,
  less to break.
- **Playwright (Chromium)** for rendering. It's the de-facto tool for headless screenshots
  and what comparable visual benchmarks use. Full-page capture with a height clamp gives
  the fairest view of a whole design without runaway images.
- **`sharp`** for the grid. Fast, dependency-light image compositing; labels are rendered
  as small SVG banners and rasterised by sharp.
- **HTML extraction is defensive.** Models wrap output inconsistently (fenced blocks,
  prose around the doc). `html.ts` tries ```html fences → any doc-like fence → raw
  `<!doctype>…</html>` slice → a body-ish fallback, so messy replies still render.
- **Config-as-run.** One JSON file fully determines a run and names its results folder,
  mirroring the `models.json`-style registries used by other LLM benchmarks. Swap files,
  not code.
- **Stages are resumable.** Each stage persists to disk and can be re-run alone — iterate
  on grid layout without re-paying for generation, for instance.
- **`--dry-run`.** Exercises render → grid → report with deterministic placeholder pages
  and zero API spend, so the pipeline (and your environment) can be verified before
  spending tokens.

## Scoring

This benchmark is intentionally **judgment-first**: the output is a grid you look at. It
records timing/tokens but assigns no automated design score — visual quality is the thing
being measured, and a human (or a vision-model judge you add downstream) is the rubric.
The grid is built to make that judgment fast.

## License

MIT.
