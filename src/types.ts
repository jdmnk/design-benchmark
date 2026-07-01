// Shared types for the design benchmark.

export type ProviderName = "openrouter" | "openai" | "anthropic";

export interface ModelEntry {
  /** Stable identifier used for folder names and the CLI. */
  slug: string;
  /** Human-readable name shown under the screenshot in the grid. */
  label: string;
  /** Which backend to route the request through. */
  provider: ProviderName;
  /** Provider-specific model id, e.g. "anthropic/claude-opus-4.1" on OpenRouter. */
  id: string;
  /** Optional per-model overrides. */
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: ReasoningEffort;
  /** Skip this model unless explicitly requested with --model. */
  skipByDefault?: boolean;
}

/**
 * OpenRouter-normalized reasoning effort. Hybrid-reasoning models default to
 * spending thousands of tokens "thinking" before emitting code — on a code-
 * generation task that regularly burns the entire max_tokens budget and returns
 * an EMPTY completion (we saw GLM 5.2 / MiniMax M3 do exactly this). Capping
 * effort at "low" leaves the budget for actual output. Ignored by models
 * without reasoning support.
 */
export type ReasoningEffort = "minimal" | "low" | "medium" | "high";

export interface RenderConfig {
  viewportWidth: number;
  viewportHeight: number;
  deviceScaleFactor: number;
  /** Capture the entire scrollable page vs. just the viewport. */
  fullPage: boolean;
  /** Hard cap on full-page screenshot height to avoid absurdly tall captures. */
  maxFullPageHeight: number;
  /** Delay after load to let fonts/animations settle. */
  waitMs: number;
  /**
   * Timeout for the screenshot call itself. Heavy canvas/WebGL animations can
   * saturate the main thread, so this defaults higher than Playwright's 30s.
   */
  screenshotTimeoutMs?: number;
  /**
   * Make a model's animated render reproducible: seed Math.random with a fixed
   * PRNG and (when freezeClock) drive a virtual clock forward by exactly waitMs
   * so requestAnimationFrame advances deterministically before capture.
   */
  seed?: number;
  freezeClock?: boolean;
  /**
   * Capture an animated clip instead of a single frame. Requires freezeClock:
   * the virtual clock is stepped one frame at a time (dt = 1000/fps) and each
   * frame is screenshotted, so the clip is deterministic and smooth no matter
   * how slowly the scene renders in headless software WebGL. waitMs is ignored
   * in this mode — preRollMs is the settle time before recording starts.
   */
  video?: VideoConfig;
}

export interface VideoConfig {
  /** Length of the captured clip. */
  durationMs: number;
  /** Frames per second of the clip (also the virtual-clock step rate). */
  fps: number;
  /** Virtual time advanced before recording starts (intro/fade-in settle). */
  preRollMs?: number;
}

export interface GridConfig {
  columns: number;
  /** Width each cell is scaled to in the grid (height is derived per image). */
  cellWidth: number;
  padding: number;
  background: string;
  labelHeight: number;
  labelColor: string;
  labelFontSize: number;
  title?: string;
  /**
   * "banner" (default): a caption strip above each screenshot.
   * "overlay": the label floats in a translucent pill over the top-left.
   * "topbar": a thin one-line strip across the top of the render (compact).
   * overlay/topbar let the render fill the whole cell (best for full-bleed
   * visual scenes — 3D, particles, SVG art).
   */
  labelStyle?: "banner" | "overlay" | "topbar";
  /** Background of the overlay pill (any CSS color, supports rgba). */
  labelOverlayBg?: string;
}

export interface GenerationConfig {
  temperature: number;
  maxTokens: number;
  /** How many model calls to run in parallel. */
  concurrency: number;
  timeoutMs: number;
  retries: number;
  /** Cap on reasoning-token spend for hybrid-reasoning models (see ReasoningEffort). */
  reasoningEffort?: ReasoningEffort;
}

export interface BenchmarkConfig {
  name: string;
  description?: string;
  systemPrompt?: string;
  prompt: string;
  render: RenderConfig;
  grid: GridConfig;
  generation: GenerationConfig;
  /**
   * Either an inline array of models, or a path (relative to the config file)
   * to a JSON file containing such an array — so many configs can share one
   * lineup, e.g. "models/standard-9.json".
   */
  models: ModelEntry[] | string;
}

/** What the render stage observed for a model, merged back into result.json. */
export interface RenderInfo {
  /** A non-blank screenshot was produced. */
  rendered: boolean;
  /** Screenshot exists but is (near-)uniform — a blank/black page. */
  blank?: boolean;
  /** First page error / crash captured, or the render failure reason. */
  error?: string;
}

/** Result of a single model generation, persisted as result.json per model. */
export interface GenerationResult {
  slug: string;
  label: string;
  provider: ProviderName;
  modelId: string;
  ok: boolean;
  error?: string;
  /** Raw text returned by the model. */
  rawResponse?: string;
  /** Extracted HTML document written to output.html. */
  htmlExtracted: boolean;
  /** Why the model stopped, e.g. "stop", "length" (= truncated), "max_tokens". */
  finishReason?: string;
  /** The completion was cut off at the token limit — a common cause of broken renders. */
  truncated?: boolean;
  elapsedMs: number;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  startedAt: string;
  /** Filled in by the render stage. */
  render?: RenderInfo;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  modelId: string;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  reasoningEffort?: ReasoningEffort;
}

export interface ChatResponse {
  text: string;
  usage?: GenerationResult["usage"];
  /** Provider's stop reason, normalized to the OpenAI vocabulary where possible. */
  finishReason?: string;
}

export interface Provider {
  name: ProviderName;
  chat(req: ChatRequest): Promise<ChatResponse>;
}
