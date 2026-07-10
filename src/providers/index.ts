import type { Provider, ProviderName } from "../types.js";
import { makeOpenAICompatibleProvider } from "./openaiCompatible.js";
import { makeAnthropicProvider } from "./anthropic.js";
import { makeClaudeCliProvider, makeCodexCliProvider } from "./cli.js";

/**
 * Lazily build the provider a model needs, reading credentials from the
 * environment. Providers are cached so we only construct each once per run.
 */
export function makeProviderRegistry() {
  const cache = new Map<ProviderName, Provider>();

  function build(name: ProviderName): Provider {
    switch (name) {
      case "openrouter": {
        const apiKey = requireEnv("OPENROUTER_API_KEY");
        return makeOpenAICompatibleProvider({
          name: "openrouter",
          baseUrl: "https://openrouter.ai/api/v1",
          apiKey,
          requestCostInUsage: true,
          extraHeaders: {
            // Optional attribution headers OpenRouter uses for its rankings.
            ...(process.env.OPENROUTER_REFERRER
              ? { "HTTP-Referer": process.env.OPENROUTER_REFERRER }
              : {}),
            ...(process.env.OPENROUTER_TITLE
              ? { "X-Title": process.env.OPENROUTER_TITLE }
              : {}),
          },
        });
      }
      case "openai": {
        const apiKey = requireEnv("OPENAI_API_KEY");
        const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
        return makeOpenAICompatibleProvider({ name: "openai", baseUrl, apiKey });
      }
      case "anthropic": {
        const apiKey = requireEnv("ANTHROPIC_API_KEY");
        return makeAnthropicProvider({ apiKey });
      }
      // Subscription CLIs — no API key; auth comes from the logged-in CLI.
      case "claude-cli":
        return makeClaudeCliProvider();
      case "codex-cli":
        return makeCodexCliProvider();
      default:
        throw new Error(`Unknown provider: ${name}`);
    }
  }

  return {
    get(name: ProviderName): Provider {
      let p = cache.get(name);
      if (!p) {
        p = build(name);
        cache.set(name, p);
      }
      return p;
    },
  };
}

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) {
    throw new Error(
      `Missing ${key}. Copy .env.example to .env and fill it in (see README).`,
    );
  }
  return v;
}
