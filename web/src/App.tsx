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
  grid: { image: string; video?: string | null; columns: number };
  models: Model[];
  rendered: number;
  total: number;
}

const benchmarks = (data as { benchmarks: Benchmark[] }).benchmarks;
const REPO = "https://github.com/jdmnk/design-benchmark";

const STATUS_LABEL: Record<Status, string> = {
  rendered: "RENDERED",
  truncated: "TRUNCATED",
  blank: "BLANK",
  "no-html": "NO HTML",
  "render-failed": "RENDER FAIL",
  error: "ERROR",
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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function StatusTag({ status }: { status: Status }) {
  return <span className={`status status--${status}`}>[{STATUS_LABEL[status]}]</span>;
}

function ModelTable({ models }: { models: Model[] }) {
  return (
    <table className="models">
      <thead>
        <tr>
          <th className="idx">#</th>
          <th>Model</th>
          <th>Status</th>
          <th className="num">Time</th>
          <th className="num">Out&nbsp;tok</th>
          <th className="num">Cost</th>
          <th>Output</th>
        </tr>
      </thead>
      <tbody>
        {models.map((m, i) => (
          <tr key={m.modelId}>
            <td className="idx">{pad2(i + 1)}</td>
            <td>
              <div className="model-label">{m.label}</div>
              <code className="model-id">{m.modelId}</code>
              {m.error && <div className="model-error">⚠ {m.error}</div>}
            </td>
            <td><StatusTag status={m.status} /></td>
            <td className="num">{fmtTime(m.elapsedMs)}</td>
            <td className="num">{fmtTokens(m.outputTokens)}</td>
            <td className="num">{fmtCost(m.costUsd)}</td>
            <td>
              {m.page ? (
                <a href={m.page} target="_blank" rel="noreferrer">OPEN ↗</a>
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

function BenchmarkSection({ b, index }: { b: Benchmark; index: number }) {
  return (
    <section className="bench" id={b.id}>
      <div className="bench-head">
        <div className="bench-no">{pad2(index + 1)}</div>
        <h2>{b.title}</h2>
        <span className="count">[{b.rendered}/{b.total} RENDERED]</span>
      </div>
      <p className="desc">{b.description}</p>

      <div className="frame">
        {b.grid.video ? (
          <a className="grid-link" href={b.grid.video} target="_blank" rel="noreferrer" title="Open full-size video">
            <video
              src={b.grid.video}
              poster={b.grid.image}
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
        ) : (
          <a className="grid-link" href={b.grid.image} target="_blank" rel="noreferrer" title="Open full-size">
            <img src={b.grid.image} alt={`${b.title} grid`} loading="lazy" />
          </a>
        )}
      </div>

      <div className="meta-row">
        <span>VIEWPORT {b.render.viewport}</span>
        <span>{b.render.fullPage ? "FULL PAGE" : "FIXED CROP"}</span>
        {b.render.video ? (
          <span>CLIP {(b.render.video.durationMs / 1000).toFixed(0)}S @ {b.render.video.fps}FPS</span>
        ) : (
          <span>SETTLE {b.render.waitMs}MS</span>
        )}
        {b.render.deterministic && (
          <span className="tag">DETERMINISTIC</span>
        )}
      </div>

      <details>
        <summary>PROMPT</summary>
        <pre className="prompt">{b.prompt}</pre>
        {b.systemPrompt && (
          <>
            <div className="sub-label">SYSTEM PROMPT</div>
            <pre className="prompt prompt--sys">{b.systemPrompt}</pre>
          </>
        )}
      </details>

      <details>
        <summary>PER-MODEL DATA ({b.total})</summary>
        <ModelTable models={b.models} />
      </details>
    </section>
  );
}

export default function App() {
  const totalModels = benchmarks.reduce((n, b) => n + b.total, 0);
  return (
    <>
      <div className="topbar">
        <span>DESIGN-BENCH</span>
        <span className="topbar-mid">VISUAL LLM BENCHMARK · {benchmarks.length} RUNS · {totalModels} GENERATIONS</span>
        <a href={REPO} target="_blank" rel="noreferrer">SOURCE ↗</a>
      </div>

      <header className="hero">
        <h1>DESIGN<br />BENCH</h1>
        <p className="tagline">One creative brief. Many models. Rendered side by side.</p>
        <p className="intro">
          Each model gets the same prompt and must return a single self-contained web page.
          Every page is rendered in a headless browser, screenshotted, and tiled into one
          grid — so you judge the output the only way that matters: by looking at it.
          Expand a run for the exact prompt and per-model time, tokens, cost, and the
          actual generated page.
        </p>

        <nav className="toc">
          <div className="toc-label">INDEX</div>
          {benchmarks.map((b, i) => (
            <a key={b.id} href={`#${b.id}`}>
              <span className="toc-no">{pad2(i + 1)}</span>
              <span className="toc-title">{b.title}</span>
              <span className="toc-count">{b.rendered}/{b.total}</span>
            </a>
          ))}
        </nav>
      </header>

      <main>
        {benchmarks.map((b, i) => (
          <BenchmarkSection key={b.id} b={b} index={i} />
        ))}
      </main>

      <footer>
        <span>// TRANSMISSION END</span>
        <span>
          DESIGN-BENCH · RUNS VIA OPENROUTER · <a href={REPO} target="_blank" rel="noreferrer">GITHUB ↗</a>
        </span>
      </footer>
    </>
  );
}
