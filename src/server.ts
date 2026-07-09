import { createServer, type Server } from "node:http";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import type { AddressInfo } from "node:net";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".hdr": "application/octet-stream",
  ".bin": "application/octet-stream",
};

export interface RenderServer {
  /** Base URL, e.g. http://127.0.0.1:54123 */
  url: string;
  /** URL for a model's page, with the importmap injected. */
  pageUrl(slug: string): string;
  close(): Promise<void>;
}

/**
 * A tiny static server used only for rendering. It serves:
 *   /<slug>/output.html   → the model's page, with the shared importmap injected
 *   /<slug>/<asset>       → any other file in that model's dir
 *   /vendor/<pkg-path>    → files from node_modules (pinned libraries)
 *
 * Serving over http:// (instead of file://) is what lets models use ES-module
 * `import`, importmaps, three.js add-ons, fetch, and workers normally.
 */
export async function startRenderServer(opts: {
  modelsDir: string;
  nodeModulesDir: string;
  importMapPath: string;
}): Promise<RenderServer> {
  const modelsRoot = resolve(opts.modelsDir);
  const vendorRoot = resolve(opts.nodeModulesDir);
  const importMapTag = buildImportMapTag(opts.importMapPath);

  const server: Server = createServer((req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const pathname = decodeURIComponent(url.pathname);

      if (pathname.startsWith("/vendor/")) {
        const file = safeJoin(vendorRoot, pathname.slice("/vendor/".length));
        if (!file) return send(res, 403, "forbidden");
        return serveFile(res, file);
      }

      const rel = pathname.replace(/^\/+/, "");
      const file = safeJoin(modelsRoot, rel);
      if (!file) return send(res, 403, "forbidden");

      // The model's HTML doc gets the importmap injected on the way out.
      if (file.endsWith(".html") && existsSync(file)) {
        const html = injectImportMap(readFileSync(file, "utf8"), importMapTag);
        res.writeHead(200, { "Content-Type": MIME[".html"] });
        return void res.end(html);
      }
      return serveFile(res, file);
    } catch {
      send(res, 500, "server error");
    }
  });

  await new Promise<void>((res) => server.listen(0, "127.0.0.1", res));
  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;

  return {
    url,
    pageUrl: (slug: string) => `${url}/${slug}/output.html`,
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}

function buildImportMapTag(importMapPath: string): string {
  try {
    const parsed = JSON.parse(readFileSync(importMapPath, "utf8"));
    const imports = parsed.imports ?? {};
    return `<script type="importmap">${JSON.stringify({ imports })}</script>`;
  } catch {
    return "";
  }
}

/** Insert the importmap as early as possible, before any module script runs. */
function injectImportMap(html: string, tag: string): string {
  if (!tag) return html;
  // Strip any import map the model wrote itself. A browser honours only ONE
  // import map, so a model-authored one — which almost always points at a CDN
  // we can't reach offline, or simply duplicates ours — breaks module
  // resolution and blanks the page. Ours (vendored, deterministic) is the
  // single source of truth for bare-specifier imports like `three`.
  html = html.replace(
    /<script\b[^>]*\btype\s*=\s*["']importmap["'][^>]*>[\s\S]*?<\/script>/gi,
    "",
  );
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch) {
    const at = headMatch.index! + headMatch[0].length;
    return html.slice(0, at) + "\n" + tag + html.slice(at);
  }
  const htmlMatch = html.match(/<html[^>]*>/i);
  if (htmlMatch) {
    const at = htmlMatch.index! + htmlMatch[0].length;
    return html.slice(0, at) + "\n" + tag + html.slice(at);
  }
  return tag + "\n" + html;
}

function serveFile(res: import("node:http").ServerResponse, file: string) {
  if (!existsSync(file) || !statSync(file).isFile()) return send(res, 404, "not found");
  res.writeHead(200, { "Content-Type": MIME[extname(file).toLowerCase()] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}

/** Join + ensure the result stays inside root (no ../ escapes). */
function safeJoin(root: string, rel: string): string | null {
  const joined = normalize(join(root, rel));
  return joined === root || joined.startsWith(root + "/") ? joined : null;
}

function send(res: import("node:http").ServerResponse, code: number, msg: string) {
  res.writeHead(code, { "Content-Type": "text/plain" });
  res.end(msg);
}
