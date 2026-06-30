import data from "./data/benchmarks.json";

type Status = "rendered" | "truncated" | "blank" | "no-html" | "render-failed" | "error";

interface Model {
  label: string;
  modelId: string;
  provider: string;
  status: Status;
  elapsedMs: number;
  outputTokens: number | null;
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
  render: { viewport: string; fullPage: boolean; waitMs: number; deterministic: boolean };
  grid: { image: string; columns: number };
  models: Model[];
  rendered: number;
  total: number;
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

function fmtTime(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}
function fmtTokens(t: number | null) {
  return t == null ? "—" : t.toLocaleString("en-US");
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
            <td>
              {m.page ? (
                <a href={m.page} target="_blank" rel="noreferrer">open ↗</a>
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

function BenchmarkCard({ b }: { b: Benchmark }) {
  return (
    <section className="card" id={b.id}>
      <div className="card-head">
        <h2>{b.title}</h2>
        <span className="count">{b.rendered}/{b.total} rendered</span>
      </div>
      <p className="desc">{b.description}</p>

      <a className="grid-link" href={b.grid.image} target="_blank" rel="noreferrer" title="Open full-size">
        <img src={b.grid.image} alt={`${b.title} grid`} loading="lazy" />
      </a>

      <div className="meta-row">
        <span>{b.render.viewport}</span>
        <span>{b.render.fullPage ? "full page" : "fixed crop"}</span>
        <span>settle {b.render.waitMs}ms</span>
        {b.render.deterministic && <span className="tag">deterministic frame</span>}
      </div>

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
        <summary>Per-model details ({b.total})</summary>
        <ModelTable models={b.models} />
      </details>
    </section>
  );
}

export default function App() {
  return (
    <>
      <header className="hero">
        <h1>Design&nbsp;Bench</h1>
        <p className="tagline">
          A visual benchmark for LLMs. One creative brief, many models, rendered side by side.
        </p>
        <p className="intro">
          Each model is given the same prompt and must return a single self-contained web
          page. We render every page in a headless browser, screenshot it, and tile the
          screenshots into one grid so you can eyeball which model did best. Below are real
          runs — click a grid to enlarge, and expand a card for the exact prompt and
          per-model timing, tokens, and the actual generated output.
        </p>
        <nav className="toc">
          {benchmarks.map((b) => (
            <a key={b.id} href={`#${b.id}`}>{b.title}</a>
          ))}
          <a href={REPO} target="_blank" rel="noreferrer" className="repo">GitHub ↗</a>
        </nav>
      </header>

      <main>
        {benchmarks.map((b) => (
          <BenchmarkCard key={b.id} b={b} />
        ))}
      </main>

      <footer>
        <span>Design Bench · runs through OpenRouter · </span>
        <a href={REPO} target="_blank" rel="noreferrer">source on GitHub</a>
      </footer>
    </>
  );
}
