import { useState } from "react";
import data from "./data/benchmarks.json";

type Status = "rendered" | "truncated" | "blank" | "no-html" | "render-failed" | "error";

interface Model {
  label: string;
  modelId: string;
  provider: string;
  status: Status;
  elapsedMs: number;
  outputTokens: number | null;
  costUsd?: number | null;
  truncated?: boolean;
  error: string | null;
  page: string | null;
}

interface Run {
  label: string;
  grid: { image: string; video?: string | null };
  models: Model[];
  rendered: number;
  total: number;
}

interface Benchmark {
  id: string;
  title: string;
  description: string;
  prompt: string;
  systemPrompt: string;
  render: {
    viewport: string;
    fullPage: boolean;
    waitMs: number;
    deterministic: boolean;
    video?: { durationMs: number; fps: number } | null;
  };
  columns: number;
  runs: Run[];
}

const benchmarks = (data as { benchmarks: Benchmark[] }).benchmarks;
const REPO = "https://github.com/jdmnk/design-benchmark";

const STATUS_LABEL: Record<Status, string> = {
  rendered: "rendered",
  truncated: "truncated",
  blank: "blank",
  "no-html": "no HTML",
  "render-failed": "render failed",
  error: "error",
};

/** "42.3s" under a minute, "15m10s" above — matches the grid labels. */
function fmtTime(ms: number) {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const min = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return rem === 60 ? `${min + 1}m0s` : `${min}m${rem}s`;
}

/** "300" under 1k, then "1.2k", "17.5k", "112k". */
function fmtTokens(t: number | null) {
  if (t == null) return "—";
  if (t < 1000) return `${Math.round(t)}`;
  const k = t / 1000;
  return k >= 100 ? `${Math.round(k)}k` : `${k.toFixed(1).replace(/\.0$/, "")}k`;
}

/** More decimals the cheaper the call, so sub-cent generations stay readable. */
function fmtCost(c: number | null | undefined) {
  if (c == null) return "—";
  const decimals = c >= 1 ? 2 : c >= 0.01 ? 3 : 4;
  return `$${c.toFixed(decimals)}`;
}

function StatusDot({ status }: { status: Status }) {
  return (
    <span className={`status status--${status}`}>
      <span className="dot" />
      {STATUS_LABEL[status]}
    </span>
  );
}

function ModelTable({ models }: { models: Model[] }) {
  return (
    <table className="models">
      <thead>
        <tr>
          <th>Model</th>
          <th>Status</th>
          <th className="num">Time</th>
          <th className="num">Out tok</th>
          <th className="num">Cost</th>
          <th>Output</th>
        </tr>
      </thead>
      <tbody>
        {models.map((m) => (
          <tr key={m.modelId}>
            <td>
              <div className="model-label">{m.label}</div>
              <code className="model-id">{m.modelId}</code>
              {m.error && <div className="model-error">{m.error}</div>}
            </td>
            <td><StatusDot status={m.status} /></td>
            <td className="num">{fmtTime(m.elapsedMs)}</td>
            <td className="num">{fmtTokens(m.outputTokens)}</td>
            <td className="num">{fmtCost(m.costUsd)}</td>
            <td>
              {m.page ? (
                <a href={m.page} target="_blank" rel="noreferrer">open</a>
              ) : (
                <span className="muted">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GridView({ run, title }: { run: Run; title: string }) {
  if (run.grid.video) {
    return (
      <a className="grid-link" href={run.grid.video} target="_blank" rel="noreferrer" title="Open full-size video">
        <video
          key={run.grid.video}
          src={run.grid.video}
          poster={run.grid.image}
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={(e) => {
            // Some browsers block even muted autoplay; nudge it and fall
            // back silently to the poster if refused.
            e.currentTarget.play().catch(() => {});
          }}
        />
      </a>
    );
  }
  return (
    <a className="grid-link" href={run.grid.image} target="_blank" rel="noreferrer" title="Open full-size">
      <img src={run.grid.image} alt={`${title} grid`} loading="lazy" />
    </a>
  );
}

function BenchmarkSection({ b }: { b: Benchmark }) {
  const [active, setActive] = useState(0);
  const run = b.runs[active] ?? b.runs[0];
  const multi = b.runs.length > 1;

  return (
    <section className="bench" id={b.id}>
      <div className="bench-head">
        <h2>{b.title}</h2>
        <span className="count">{run.rendered}/{run.total} rendered</span>
      </div>
      <p className="desc">{b.description}</p>

      {multi && (
        <div className="runtabs" role="tablist">
          {b.runs.map((r, i) => (
            <button
              key={r.label}
              role="tab"
              aria-selected={i === active}
              className={i === active ? "active" : ""}
              onClick={() => setActive(i)}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      <GridView run={run} title={b.title} />

      <p className="meta">
        {b.render.viewport} · {b.render.fullPage ? "full page" : "fixed crop"} ·{" "}
        {b.render.video
          ? `${(b.render.video.durationMs / 1000).toFixed(0)}s clip at ${b.render.video.fps} fps`
          : `${b.render.waitMs}ms settle`}
        {b.render.deterministic && " · deterministic"}
      </p>

      <details>
        <summary>Prompt</summary>
        <pre className="prompt">{b.prompt}</pre>
        {b.systemPrompt && (
          <>
            <div className="sub-label">System prompt</div>
            <pre className="prompt prompt--sys">{b.systemPrompt}</pre>
          </>
        )}
      </details>

      <details>
        <summary>Per-model details{multi ? ` · ${run.label}` : ""}</summary>
        <ModelTable models={run.models} />
      </details>
    </section>
  );
}

export default function App() {
  return (
    <div className="page">
      <header>
        <h1>Design Bench</h1>
        <p className="intro">
          A visual benchmark for LLMs. Each model gets the same creative brief and returns a
          single self-contained web page; every page is rendered in a headless browser and the
          screenshots are tiled into one grid. Expand a run for the exact prompt and per-model
          time, tokens, cost, and generated output.
        </p>
        <nav>
          {benchmarks.map((b) => (
            <a key={b.id} href={`#${b.id}`}>{b.title}</a>
          ))}
          <a href={REPO} target="_blank" rel="noreferrer">GitHub</a>
        </nav>
      </header>

      <main>
        {benchmarks.map((b) => (
          <BenchmarkSection key={b.id} b={b} />
        ))}
      </main>

      <footer>
        Runs via OpenRouter · <a href={REPO} target="_blank" rel="noreferrer">Source on GitHub</a>
      </footer>
    </div>
  );
}
