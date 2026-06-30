import type { ChatRequest, ChatResponse, Provider } from "../types.js";

/**
 * Native Anthropic Messages API provider. Optional — most users will route
 * Claude models through OpenRouter instead, but this exists so the benchmark
 * can hit the first-party API directly when ANTHROPIC_API_KEY is set.
 */
export function makeAnthropicProvider(opts: { apiKey: string }): Provider {
  return {
    name: "anthropic",
    async chat(req: ChatRequest): Promise<ChatResponse> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), req.timeoutMs);
      try {
        // Anthropic takes the system prompt as a top-level field, not a message.
        const system = req.messages.find((m) => m.role === "system")?.content;
        const messages = req.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "x-api-key": opts.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: req.modelId,
            system,
            messages,
            temperature: req.temperature,
            max_tokens: req.maxTokens,
          }),
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText}: ${body.slice(0, 500)}`);
        }

        const data = (await res.json()) as any;
        const text: string = (data?.content ?? [])
          .filter((b: any) => b.type === "text")
          .map((b: any) => b.text)
          .join("");
        if (!text) throw new Error(`Empty completion. Raw: ${JSON.stringify(data).slice(0, 500)}`);

        return {
          text,
          usage: data?.usage
            ? {
                promptTokens: data.usage.input_tokens,
                completionTokens: data.usage.output_tokens,
                totalTokens:
                  (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
              }
            : undefined,
        };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
