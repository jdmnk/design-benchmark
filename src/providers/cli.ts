import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ChatRequest, ChatResponse, Provider } from "../types.js";

// Model HTML can be large; give the CLI stdout plenty of room.
const MAX_OUTPUT = 64 * 1024 * 1024;

/** Spawn a CLI with stdin closed (/dev/null) and collect stdout/stderr. */
function runCli(
  cmd: string,
  args: string[],
  opts: { cwd: string; timeoutMs: number },
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    // stdin "ignore" = /dev/null, so the agent CLIs see EOF immediately
    // instead of waiting on a would-be pipe.
    const child = spawn(cmd, args, { cwd: opts.cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGKILL");
      reject(new Error(`${cmd} timed out after ${opts.timeoutMs}ms`));
    }, opts.timeoutMs);
    child.stdout.on("data", (d) => {
      stdout += d;
      if (stdout.length > MAX_OUTPUT) child.kill("SIGKILL");
    });
    child.stderr.on("data", (d) => { stderr += d; });
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (!killed) resolve({ stdout, stderr, code });
    });
  });
}

/** system + user messages joined into one prompt string for the CLIs. */
function combinePrompt(req: ChatRequest): string {
  return req.messages.map((m) => m.content).join("\n\n");
}

/**
 * Runs Claude models through the local Claude Code CLI (`claude -p`) using the
 * machine's logged-in subscription — NOT the API. `--output-format json`
 * carries the response text plus token usage. Each call runs in a throwaway
 * temp cwd so no repo context (CLAUDE.md, files) leaks into the generation.
 * Cost is intentionally omitted: these are flat-rate subscription calls, so a
 * per-request USD figure would be misleading.
 */
export function makeClaudeCliProvider(): Provider {
  return {
    name: "claude-cli",
    async chat(req: ChatRequest): Promise<ChatResponse> {
      const cwd = mkdtempSync(join(tmpdir(), "dbench-claude-"));
      try {
        const { stdout, stderr, code } = await runCli(
          "claude",
          [
            "-p",
            combinePrompt(req),
            "--model",
            req.modelId,
            "--output-format",
            "json",
            // Claude Code is agentic by default: without this it may WRITE the
            // HTML to a file and just describe what it did, leaving no HTML in
            // the response. Disabling every tool forces a pure text generation
            // (the model prints the document inline). Keep this list at the end
            // so the variadic flag only swallows tool names.
            "--disallowedTools",
            "Bash", "Edit", "Write", "MultiEdit", "NotebookEdit", "Read", "Glob",
            "Grep", "LS", "WebFetch", "WebSearch", "Task", "TodoWrite",
          ],
          { cwd, timeoutMs: req.timeoutMs },
        );
        if (code !== 0) {
          throw new Error(`claude CLI exited ${code}: ${(stderr || stdout).slice(-400)}`);
        }
        let parsed: any;
        try {
          parsed = JSON.parse(stdout);
        } catch {
          throw new Error(`claude CLI returned non-JSON: ${stdout.slice(0, 300)}`);
        }
        if (parsed.is_error) {
          throw new Error(`claude CLI error: ${String(parsed.result).slice(0, 300)}`);
        }
        const text: string = parsed.result ?? "";
        if (!text) throw new Error("claude CLI returned empty result");
        return {
          text,
          finishReason: parsed.stop_reason ?? "stop",
          usage: parsed.usage
            ? {
                promptTokens: parsed.usage.input_tokens,
                completionTokens: parsed.usage.output_tokens,
              }
            : undefined,
        };
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    },
  };
}

/**
 * Runs OpenAI models through the local Codex CLI (`codex exec`) using the
 * machine's Codex subscription — NOT the API. `-o` writes the final message
 * (the HTML) to a file; `-c model_reasoning_effort=<effort>` sets the effort
 * (e.g. "high"). Runs read-only in a throwaway cwd so it can't touch the repo.
 */
export function makeCodexCliProvider(): Provider {
  return {
    name: "codex-cli",
    async chat(req: ChatRequest): Promise<ChatResponse> {
      const cwd = mkdtempSync(join(tmpdir(), "dbench-codex-"));
      const outFile = join(cwd, "message.txt");
      try {
        const args = [
          "exec",
          combinePrompt(req),
          "-m",
          req.modelId,
          "--skip-git-repo-check",
          "--sandbox",
          "read-only",
          "-o",
          outFile,
        ];
        if (req.reasoningEffort) {
          args.push("-c", `model_reasoning_effort=${req.reasoningEffort}`);
        }
        const { stderr, stdout, code } = await runCli("codex", args, {
          cwd,
          timeoutMs: req.timeoutMs,
        });
        if (code !== 0) {
          throw new Error(`codex CLI exited ${code}: ${(stderr || stdout).slice(-400)}`);
        }
        let text = "";
        try {
          text = readFileSync(outFile, "utf8");
        } catch {
          throw new Error(`codex CLI produced no output file. stderr: ${stderr.slice(-300)}`);
        }
        if (!text.trim()) throw new Error("codex CLI returned empty message");
        return { text, finishReason: "stop" };
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    },
  };
}
