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
  /** Skip this model unless explicitly requested with --model. */
  skipByDefault?: boolean;
}

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
}

export interface GenerationConfig {
  temperature: number;
  maxTokens: number;
  /** How many model calls to run in parallel. */
  concurrency: number;
  timeoutMs: number;
  retries: number;
}

export interface BenchmarkConfig {
  name: string;
  description?: string;
  systemPrompt?: string;
  prompt: string;
  render: RenderConfig;
  grid: GridConfig;
  generation: GenerationConfig;
  models: ModelEntry[];
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
  elapsedMs: number;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  startedAt: string;
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
}

export interface ChatResponse {
  text: string;
  usage?: GenerationResult["usage"];
}

export interface Provider {
  name: ProviderName;
  chat(req: ChatRequest): Promise<ChatResponse>;
}
