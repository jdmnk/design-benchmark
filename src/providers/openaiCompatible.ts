import type { ChatRequest, ChatResponse, Provider, ProviderName } from "../types.js";

/**
 * A provider that speaks the OpenAI `/chat/completions` wire format.
 * OpenRouter, OpenAI, Together, Groq, vLLM, LM Studio, etc. all use this shape,
 * so OpenRouter (our primary) and a generic OpenAI-compatible endpoint share
 * this single implementation — only base URL / key / headers differ.
 */
export function makeOpenAICompatibleProvider(opts: {
  name: ProviderName;
  baseUrl: string;
  apiKey: string;
  extraHeaders?: Record<string, string>;
}): Provider {
  return {
    name: opts.name,
    async chat(req: ChatRequest): Promise<ChatResponse> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), req.timeoutMs);
      try {
        const res = await fetch(`${opts.baseUrl.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${opts.apiKey}`,
            ...opts.extraHeaders,
          },
          body: JSON.stringify({
            model: req.modelId,
            messages: req.messages,
            temperature: req.temperature,
            max_tokens: req.maxTokens,
          }),
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText}: ${body.slice(0, 500)}`);
        }

        const data = (await res.json()) as any;
        const choice = data?.choices?.[0];
        const text: string = choice?.message?.content ?? "";
        const finishReason: string | undefined = choice?.finish_reason ?? undefined;
        if (!text) {
          // Reasoning models sometimes spend the whole budget on `reasoning` and
          // return empty content with finish_reason "length" — surface that.
          const why = finishReason === "length" ? " (hit token limit before producing output)" : "";
          throw new Error(`Empty completion${why}. Raw: ${JSON.stringify(data).slice(0, 300)}`);
        }

        return {
          text,
          finishReason,
          usage: data?.usage
            ? {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
              }
            : undefined,
        };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
