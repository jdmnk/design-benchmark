# Designing Robust Benchmarks for LLM Render-Code Tasks

How to build a benchmark where models must emit HTML / SVG / three.js / raw HTML that renders — without success rates being dominated by black screens, compile failures, and timeouts. Synthesized from how existing rendering/code benchmarks (Design2Code, Web2Code, DesignBench, WebDev Arena, ArtifactsBench, StarVector/SVG-Bench, SVGenius, GPTEval3D, and the code-gen literature) actually handle these problems.

---

## TL;DR — the seven principles

1. **Separate "did it render" from "is it good."** Report a render/validity rate (executability) as its own headline number, distinct from quality. This is the single most important fix: it stops fragility from contaminating your quality signal, and it's standard practice (DesignBench tracks compilation success as a first-class metric).
2. **Render-back-then-compare is non-negotiable.** Never score the raw code text. Execute it in a headless browser, screenshot it, score the screenshot. Text similarity is explicitly rejected by Web2Code and StarVector as misleading.
3. **Gate rewards/scores on a validity check first.** A blank/black/non-compiling render scores 0 by construction (SGP-RL's "format-validity gate"; ReLook's zero-reward-for-invalid-render). A mostly-correct render keeps partial credit via per-dimension scoring.
4. **Make the harness defend against fragility, not the model.** Treat each render as a disposable, killable, network-isolated process. In-page timeouts can't stop `while(true){}` — only killing the OS process can.
5. **Scaffold weaker models with a skeleton.** Weak models fail on boilerplate (lights, camera, append-to-DOM, viewBox), not the creative part. Give them a pre-filled template so the canvas physically can't be black. Few-shot roughly doubles weak-model success; zero-shot can actively hurt them.
6. **Control output length deliberately.** Truncation is the #1 cause of "broken render" — a cut-off `</svg>` is dead. Budget `max_tokens` generously per model, detect `stop_reason: max_tokens` as an automatic fail, and instruct minimal self-contained output.
7. **Use pairwise/rubric scoring, not raw pixel diff.** VLM judges rank reliably but score poorly in absolute terms; pixel MSE/SSIM are brittle to tiny layout shifts. Prefer block-matching + embedding similarity + a rubric-anchored VLM judge, reported as separate dimensions.

---

## 1. Harness architecture (the robustness layer)

### Render in a real headless browser
The universal pattern across Design2Code (Selenium), DesignBench (Playwright), Web2Code (Selenium), WebDev Arena (E2B/Firecracker sandbox), ArtifactsBench (sandbox + scripted interaction): execute → screenshot → score. **Use Playwright + Chromium** as the default — bundled patched builds, auto-waiting, per-context isolation, clean network interception.

### Getting WebGL/three.js to actually render headless
Headless Chromium does not use a hardware GPU by default; WebGL falls back to software. Key flags:

- `--use-gl=swiftshader` / `--use-angle=swiftshader` — deterministic, GPU-free software WebGL. **The safe choice for CI/containers.** (Mesa `llvmpipe` via ANGLE GL is reported ~49% cheaper CPU and still deterministic.)
- `--use-angle=gl` (a.k.a. `--use-gl=gl`) + a real GPU + Xvfb — for hardware acceleration (one benchmark went 8fps → 60fps switching to this). Only if you have GPU hardware.
- `--headless=new` — the modern headless mode (a real browser); markedly better WebGL/Canvas fidelity. Always prefer over legacy headless.
- `--disable-dev-shm-usage` — **mandatory in Docker** (default `/dev/shm` is 64MB → "Page crashed!").
- Verify with a screenshot of `chrome://gpu`.

### The WebGL "black screenshot" trap
A WebGL canvas screenshots **black even when it rendered correctly**, because the drawing buffer is cleared after compositing. Fix:

- Create the renderer with `preserveDrawingBuffer: true` (`new THREE.WebGLRenderer({ preserveDrawingBuffer: true })`).
- **three.js gotcha:** if you pass a pre-created context to the renderer, three.js *ignores* `preserveDrawingBuffer`/`antialias`/`alpha` — set them at `getContext` time. No warning is emitted.
- Or capture in the same tick as `renderer.render()` before the buffer clears.

### Waiting for paint before screenshotting (#1 cause of false blanks)
- **Do not rely on `networkidle`** — client-side animation involves no network, so it fires before anything paints.
- Canonical pattern: `waitForSelector('canvas')` → **double `requestAnimationFrame`** → screenshot. First rAF waits for the next frame; the second guarantees it painted. Add `setTimeout(resolve, 500)` for stubborn scenes.
- Best practice: have the skeleton set `window.__sceneRendered = true` after the first `renderer.render()`, then `page.waitForFunction(() => window.__sceneRendered, null, { polling: 'raf' })`.

### Sandboxing untrusted generated code (defense in depth)
The OS/VM boundary is the only real security boundary; everything else is best-effort.

- **iframe:** inject untrusted code as `<iframe sandbox="allow-scripts" srcdoc="...">` from a *distinct origin*. Never combine `allow-scripts` + `allow-same-origin` for untrusted same-origin content (the frame can remove its own sandbox).
- **CSP (via HTTP header, not meta tag):** start from total denial — `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'`. `connect-src 'none'` kills fetch/XHR/WebSocket exfil.
- **Network:** OS-level `--network none` is the strong control (Chrome's `--host-resolver-rules` is unreliable in headless). Also `serviceWorkers: 'block'`.
- **Container/VM:** one ephemeral container or microVM per render. **gVisor (`runsc`)** is the recommended sandbox; **Firecracker microVMs** (~125ms boot) for the strongest tier. Harden with `--cap-drop=ALL`, `--read-only` + tmpfs, non-root, `--memory/--cpus/--pids-limit`.

### Timeout & resource limits (the hard part)
**You cannot reliably interrupt synchronous JS from outside its thread.** Page-level timeouts ride on the same renderer main thread a `while(true){}` never yields. Only killing the OS process is a guaranteed stop.

- **Per-render wall-clock timeout** via `Promise.race` + `AbortController`; on overrun, forcibly tear down — capture `browser.process().pid` first, race `browser.close()` against a 2s sleep, then `tree-kill(pid, 'SIGKILL')` to reap the whole process tree. Run `tini`/`docker run --init` as PID 1 to reap zombies.
- **Note:** `page.goto` defaults to `timeout: 0` (no timeout) in the library API — always set it explicitly.
- **CPU/memory caps:** Docker `--memory`, `--cpus`, `--pids-limit`; OS `RLIMIT_CPU`/`RLIMIT_AS` on the browser subprocess (strongest single-render control); Chrome `--js-flags="--max-old-space-size=512"` makes a memory bomb crash only the renderer (catch via `page.on('crash')`).
- **Pre-flight:** reject oversized input *before* launching a browser (a 50MB blob OOMs during parse, before any timeout fires). Cap viewport, use `deviceScaleFactor: 1`, avoid `fullPage: true` on untrusted content.

### Capture failure signals
Attach these listeners *before* navigation:
- `page.on('console', ...)` for error-level messages.
- `page.on('pageerror', ...)` for uncaught JS exceptions (with stack).
- `page.on('crash', ...)` for renderer OOM.
- In-page: `canvas.addEventListener('webglcontextlost', () => window.__contextLost = true)`.

Crucially, **distinguish a code bug (thrown exception, blank framebuffer → feed to repair) from a harness/transient failure (timeout, fetch fail, sandbox crash → idempotent retry, don't burn a repair attempt).**

---

## 2. Detecting blank / black / failed renders

A blank or uniform render has near-zero pixel variance — the cheapest, most reliable first-pass signal. Layer them:

1. **Pixel statistics (primary gate).** Convert to luminance (`L = 0.2126R + 0.7152G + 0.0722B`), flag failed if `stddev < ~2` (of 255). Then label by mean: `mean≈0 → all-black`, `mean≈255 → all-white/blank`. (Pillow `ImageStat`, numpy `np.std`, OpenCV `cv2.meanStdDev`, Node `sharp().stats()`.)
2. **Histogram + entropy** (robust to stray noise pixels): flag if >99% of pixels in one bin, or Shannon entropy `< ~0.5–1.0` bits (rich render ≈ 8).
3. **In-page WebGL check:** `gl.readPixels(...)` and count non-black pixels; flag if `<0.1%` non-black (needs `preserveDrawingBuffer:true`).
4. **Diff vs a known-blank baseline** (catches "only default page chrome rendered"): `pixelmatch` < 0.5% differing pixels, or SSIM > 0.99 to blank ⇒ effectively blank.

**Calibrate thresholds on a labeled set** of known-good vs known-blank screenshots — the right cutoff depends on your compression/AA noise.

There are five distinct "blank" failure modes, each with its own fix: captured-before-paint (white), transparent-body + `omitBackground` artifacts, `position:fixed` smear in full-page shots, empty WebGL buffer, lazy-loaded images.

---

## 3. Prompting & output format (avoiding fragility at the source)

### Output length / truncation
- Truncation directly produces broken renders — a cut-off file is a syntax error / blank page. Both too-tight *and* unbudgeted caps hurt.
- **Calibrate `max_tokens` per model** from a generous trial run (observe longest real outputs, set just above), not one global small cap.
- **Detect truncation as a fail signal:** `stop_reason: "max_tokens"` → mark truncated; optionally run a **backtracking AST repair** (remove lines from the end until the code parses) to salvage rather than zero the sample.
- Instruct: "emit one complete self-contained file and nothing else; keep the scene minimal." Verbosity is the enemy of a complete render for weak models.

### Structured / extractable output
- **Ask for ONE self-contained file, code only, no prose** (WebCoderBench prompt: "output only native HTML, CSS, JS"). Inline all CSS/JS, no external assets.
- **Extraction pipeline** (what HumanEval/BigCodeBench actually do): take the contents of the **last fenced code block**; fall back to raw text if no fence; run a `sanitize()` step; validate the closing tag exists. BigCodeBench ships a dedicated `sanitize()` as a first-class, tested component.
- **Watch stop tokens** that decapitate code (LiveCodeBench's `###` stop token cut off solutions emitted after a `### Solution` header). Pick stop sequences that can't appear inside the artifact.
- **Prefill the opening fence + stop on the closing fence** for older/open models to kill "Sure, here's your code…" preamble. **Caveat:** prefill is *not supported* on the newest Claude models (returns 400) — for those, rely on a firm system instruction + last-block extraction.
- Grammar-constrained decoding (Outlines/XGrammar) can guarantee valid envelopes if you need a JSON wrapper, but for raw HTML/SVG the "single fenced block + last-block extraction" is usually more robust and avoids escaping bloat.

### Scaffolding for weaker models (biggest lever)
- **Few-shot significantly benefits weak models; zero-shot can hurt them** (gaps commonly ~2×). Use 1–2 examples in the exact target format with strict, consistent templates and explicit delimiters.
- **Provide a pre-filled skeleton** so the model only fills the creative middle. For three.js, the skeleton should already contain: CDN import (pinned version, e.g. `r128`), `Scene` + `PerspectiveCamera` + `WebGLRenderer({antialias:true})`, `renderer.setSize`, **append `renderer.domElement` to the DOM**, and a `requestAnimationFrame` loop calling `renderer.render`.
- **Prevent the black canvas with mandatory defaults in the skeleton** — the documented "95% of the time" causes of a black three.js screen, all pre-fillable:
  - Add a light (`AmbientLight` + directional) — missing lights is the #1 cause; standard materials are invisible without light.
  - Set `camera.position.z` away from origin and `camera.lookAt(0,0,0)` — default camera sits inside geometry.
  - Set a non-black `scene.background` / `renderer.setClearColor` so even an empty scene reads as "rendered," not "failed."
- **For SVG**, give a fixed `viewBox`, default `fill`/`stroke`, and a background `<rect>` so an under-specified output still renders something visible.
- **Provide LLM-tailored library docs in-context** (`llms.txt` / `llms-full.txt`, which three.js publishes) so weak models use real APIs instead of hallucinating them.

### Self-containment
- Single file: inline all CSS/JS, no frameworks, no external assets, "fully functional from `file://`." External images/fonts/data fail to load in a sandboxed headless renderer → blank/broken. Inline data URIs or generate procedurally.
- Pin CDN versions when a library is unavoidable, so renders are reproducible.

### Decoding settings
- **Temperature 0 / greedy for pass@1** deterministic benchmarking (`temperature=0, top_p=1`, fixed seed). Optimal pass@1 settings are essentially greedy.
- Caveat: temperature 0 is *not* fully deterministic (batching/kernel nondeterminism); still fix seeds, accept minor variance, report it.
- Use higher temperature only if you score pass@k with multiple samples.
- Instruct defensive code in the artifact (try/catch around init, default camera/lighting, WebGL-unavailable fallback) so one runtime error doesn't blank the page.

---

## 4. Retry / self-repair loops

- **N=3 total (1 generation + 2 repairs) is the sweet spot.** The first repair round is by far the biggest gain; "two repair rounds capture 76–95% of achievable gains"; rounds 4+ ≈ zero. Hard-cap at 4.
- **Feedback quality is load-bearing.** "Is Self-Repair a Silver Bullet?" found that at equal token budget, repair often doesn't beat just sampling more candidates — pure "try again, it's wrong" loops are unreliable. A *real* signal (stack trace, failing assertion, **rendered screenshot**) is what makes repair work.
- **Visual/screenshot feedback** is directly relevant: render → feed screenshot + target back to a vision model → close the gap (Design2Code self-revision, ChartMimic). Gate each iteration on a measured CLIP/SSIM delta and roll back if not closer, to avoid degenerative "agrees-with-itself" loops.
- **Repair prompt** = task spec + offending code + full error & exception type + (for visual failures) the screenshot, with a chain-of-thought "diagnose-then-fix" structure for capable models.
- **Classify before retrying:** timeout / 429 / sandbox crash / CDN fetch = harness failure → idempotent retry, don't burn a repair attempt. Thrown exception / compile error / blank framebuffer = code failure → repair loop.
- **Report pass@1 (no repair) as the headline; report repair-assisted rates separately and labelled.** Never fold repairs into an unqualified pass@1.

---

## 5. Scoring / judging

### The spectrum (most → least mechanistic)
1. **Pixel metrics** (MSE/SSIM/LPIPS) — brittle to tiny layout shifts and poorly human-aligned for clean UI/vector renders. Use only as secondary.
2. **Embedding similarity** — CLIP (layout/semantics gestalt) and DINO/DINOv2/SigLIP (structure/contour). DinoScore = L2 between DINOv2 features. SigLIP is the human-aligned choice for SVG (SVGauge shows FID/LPIPS/CLIP fail there).
3. **Element/structural matching** — Design2Code's gold standard: detect blocks, pair them with the Jonker-Volgenant optimal-assignment algorithm, then score Block-Match (area ratio — penalizes missing/hallucinated content, drives a blank page to ~0), Text similarity (Dice), Position similarity, and Color similarity (CIEDE2000 perceptual). Robust to small position jitter.
4. **VLM/MLLM-as-judge with a rubric** — now dominant for interactive/aesthetic output. Web2Code (GPT-4V, 10 criteria 0–10), DesignBench (GPT-4o 0–10), ArtifactsBench (Gemini-2.5-Pro + Qwen2.5-VL-72B over temporal frames). Report 90%+ human agreement.
5. **Human pairwise + Bradley-Terry/Elo** — WebDev Arena (gold standard, unautomated).

### What the meta-evaluations say
- **VLM judges rank reliably but score poorly in absolute terms** → prefer pairwise. WebDevJudge: best judge (GPT-4.1 pairwise) reaches only ~70% agreement with experts; **pairwise beats single-answer grading by >8 points.**
- **Rubric trees** (decompose the requirement into a hierarchy of verifiable leaf criteria) raised inter-annotator agreement past 80% and give partial credit naturally — a mostly-correct render accumulates most leaves; a broken one fails most.
- **Both modalities together (screenshot + code) beat either alone.**
- Use G-Eval "form-filling": give the judge explicit evaluation steps + per-level descriptors, output structured per-dimension scores. Dimensions: visual fidelity / layout / content / code correctness / interactivity.

### Handling fragility fairly
- **Render/validity rate reported separately from quality** (DesignBench tracks compilation explicitly; SolEval-style Compile@k vs Pass@k). "Higher execution rate ≠ better code."
- **Compile/render failure → automatic 0 quality**, gated by construction, with render-rate reported alongside.
- **pass@k over multiple samples** absorbs one-off flaky failures.
- **Recommended reporting shape:** (1) render/validity rate, (2) per-dimension quality conditioned on rendering, (3) pass@k for fragility, (4) headline pairwise/Elo ranking. Don't collapse to one number.

### Judge biases to mitigate
- **Position/order bias** (~5% even with instructions): run both orders, average/check consistency.
- **Verbosity/length bias** (judges prefer longer/more-elaborate output): Chatbot Arena "Style Control" regresses out length/markdown; do the analog for "more elaborate-looking" renders.
- **Self-preference:** use a different-family judge than the models under test, or a jury/ensemble.
- **Non-transitivity** (A>B>C>A) can corrupt Elo from pairwise judges — watch for cycles.

---

## 6. Recommended end-to-end stack

**Generation**
1. System prompt: "Output exactly one complete, self-contained file. Inline all CSS and JS. No external assets. No prose — respond with only a single fenced ```html (or ```svg) block."
2. Provide a filled skeleton (CDN pinned; scene/camera/renderer/lighting/loop or SVG viewBox+background already present) so the model edits only the creative middle.
3. 1–2 few-shot examples in the exact target format.
4. Decoding: `temperature=0, top_p=1`, fixed seed. Calibrate `max_tokens` per model; on `stop_reason=max_tokens`, mark truncated (optionally backtracking-AST repair).

**Extraction**
5. Last fenced block → fallback to raw → sanitize → validate closing tag.

**Isolation**
6. One ephemeral container/microVM per render under gVisor `runsc`, `--network none`, `--cap-drop=ALL`, `--read-only` + tmpfs, non-root, `--memory/--cpus/--pids-limit`; browser spawned under `RLIMIT_CPU`/`RLIMIT_AS`.

**Browser**
7. Playwright Chromium `--headless=new`, `--use-gl=swiftshader` (or `--use-angle=gl` + GPU/Xvfb if available), `--disable-dev-shm-usage`, `--js-flags=--max-old-space-size=…`; fresh context per sample; block service workers.

**Page**
8. Untrusted code in separate-origin `<iframe sandbox="allow-scripts" srcdoc>` + strict CSP header; `context.route` aborting non-local requests.

**Render + capture**
9. `waitForSelector('canvas')` → double-rAF (or `waitForFunction polling:'raf'` on a scene-ready flag) → bounded-viewport screenshot with explicit `timeout`; `preserveDrawingBuffer:true` on the WebGL context.

**Signals & watchdog**
10. Attach `console`/`pageerror`/`crash`/`webglcontextlost` listeners before navigation; whole render in `Promise.race` + AbortController; on overrun `tree-kill(pid,'SIGKILL')`; `tini`/`--init` reaps zombies.

**Validate render**
11. Luminance stddev/entropy gate + pixelmatch-vs-blank baseline + WebGL `readPixels` non-black check; classify the five blank failure modes.

**Repair (optional, logged separately)**
12. N≤3, classify transient-vs-code failure, CoT diagnose-then-fix prompt with error + screenshot, T=0 then fresh resample; report pass@1 distinct from repair-assisted.

**Score**
13. Gate on validity (non-render → 0). Reference-based: block-matching + embedding similarity. Reference-free: rubric-tree VLM judge (both modalities, both orders). Report render-rate + per-dimension quality + pass@k + pairwise/Elo separately.

---

## Sources

**Rendering/code benchmarks**
- Design2Code — https://arxiv.org/abs/2403.03163 · https://salt-nlp.github.io/Design2Code/ · https://github.com/NoviScl/Design2Code
- Web2Code — https://arxiv.org/pdf/2406.20098 · https://mbzuai-llm.github.io/webpage2code/
- DesignBench — https://arxiv.org/abs/2506.06251 · https://webpai.github.io/DesignBench/
- WebDev Arena — https://news.lmarena.ai/webdev-arena/ · https://arena.ai/blog/webdev-arena/
- ArtifactsBench — https://arxiv.org/abs/2507.04952 · https://artifactsbenchmark.github.io/ · https://github.com/Tencent-Hunyuan/ArtifactsBenchmark
- StarVector / SVG-Bench — https://arxiv.org/html/2312.11556v3 · https://starvector.github.io/
- VGBench — https://arxiv.org/pdf/2407.10972 · https://vgbench.github.io/
- SVGenius — https://arxiv.org/html/2506.03139v1 · https://github.com/ZJU-REAL/SVGenius
- SGP-Bench — https://arxiv.org/html/2408.08313v3 · https://sgp-bench.github.io/
- SGP-GenBench / SGP-RL (validity gate) — https://arxiv.org/html/2509.05208v1 · https://spherelab.ai/SGP-Gen/
- ReLook (zero reward for invalid renders) — https://arxiv.org/abs/2510.11498
- SceneCraft (Blender, LLM-reviewer loop) — https://arxiv.org/html/2403.01248v1
- ReactEval (E2B sandbox) — https://e2b.dev/blog/reacteval-building-llm-benchmark-for-frontend

**Harness / rendering engineering**
- Headless WebGL flags (60fps) — https://www.createit.com/blog/headless-chrome-testing-webgl-using-playwright/
- Mesa llvmpipe vs SwiftShader — https://botbrowser.io/en/blog/mesa-llvmpipe-vs-swiftshader-chromium-linux/
- Blank/white screenshot fixes — https://screenshotrun.com/blog/puppeteer-playwright-blank-white-screenshots
- Playwright networkidle caveat — https://playwright.dev/docs/api/class-frame
- three.js preserveDrawingBuffer gotcha — https://github.com/mrdoob/three.js/issues/17255
- iframe sandbox — https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe
- CSP — https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
- gVisor — https://gvisor.dev/docs/architecture_guide/intro/ · Firecracker — https://github.com/firecracker-microvm/firecracker
- AbortSignal/timeouts — https://nearform.com/insights/using-abortsignal-in-node-js/
- Killing runaway Chrome — https://www.browserless.io/blog/2023/12/05/advanced-issues-when-managing-chrome-on-aws/
- Blank-image detection — https://blog.finxter.com/5-best-ways-to-check-if-an-image-is-empty-using-opencv-python/ · https://pillow.readthedocs.io/en/stable/reference/ImageStat.html · pixelmatch https://github.com/mapbox/pixelmatch

**Prompting / output / repair**
- Truncation taxonomy + backtracking-AST repair — https://arxiv.org/pdf/2504.20799
- Token budgeting / graceful degradation — https://arxiv.org/html/2504.15989v2
- Anthropic stop reasons / prefill — https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons · https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/prefill-claudes-response
- BigCodeBench sanitize() — https://github.com/bigcode-project/bigcodebench/blob/main/bigcodebench/generate.py
- LiveCodeBench stop-token pitfalls — https://arxiv.org/html/2403.07974v2 · https://blog.collinear.ai/p/lcb-bug-fixes
- Few-shot helps weak models — https://arxiv.org/html/2412.02906
- three.js black-screen causes — https://discourse.threejs.org/t/three-js-not-rendering-anything-at-all-its-all-a-black-screen/37452
- three.js llms.txt — https://www.threejs-blocks.com/llm · https://github.com/mrdoob/three.js/blob/dev/docs/llms-full.txt
- Self-repair sweet spot — https://arxiv.org/html/2604.10508
- "Is Self-Repair a Silver Bullet?" — https://arxiv.org/abs/2306.09896 · Reflexion — https://arxiv.org/abs/2303.11366
- Temperature/greedy for pass@1 — https://arxiv.org/html/2309.02772v3

**Scoring / judging**
- WebDevJudge — https://arxiv.org/pdf/2510.18560
- MLLM-as-a-Judge — https://arxiv.org/pdf/2402.04788 · https://mllm-judge.github.io/
- "VLM Judges Can Rank but Cannot Score" — https://arxiv.org/html/2604.25235v1
- GPTEval3D (text-to-3D judge) — https://gpteval3d.github.io/
- SVGauge (human-aligned SVG metric) — https://arxiv.org/pdf/2509.07127
- Chatbot Arena / Bradley-Terry + Style Control — https://arxiv.org/pdf/2403.04132 · https://www.lmsys.org/blog/2023-12-07-leaderboard/
- Non-transitivity in LLM judges — https://arxiv.org/pdf/2502.14074
- SolEval Compile@K — https://arxiv.org/pdf/2502.18793
- G-Eval — https://cameronrwolfe.substack.com/p/llm-as-a-judge
