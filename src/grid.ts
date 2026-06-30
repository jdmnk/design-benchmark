import { existsSync, readFileSync } from "node:fs";
import sharp from "sharp";
import type { BenchmarkConfig, GenerationResult, ModelEntry } from "./types.js";
import { runPaths } from "./paths.js";

interface Cell {
  label: string;
  image: Buffer; // composited cell (label strip + screenshot/placeholder)
  width: number;
  height: number;
}

/**
 * Tile every model's screenshot into one side-by-side grid PNG, N columns wide,
 * each screenshot scaled to a fixed width with a labelled caption above it.
 */
export async function buildGrid(
  cfg: BenchmarkConfig,
  models: ModelEntry[],
): Promise<string> {
  const paths = runPaths(cfg.name);
  const g = cfg.grid;
  const placeholderHeight = Math.round(g.cellWidth * 0.66);

  const cells: Cell[] = [];
  for (const model of models) {
    const shot = paths.screenshot(model.slug);
    const stats = statsLine(loadResult(paths.result(model.slug)));
    const cell = existsSync(shot)
      ? await makeImageCell(shot, model.label, stats, g)
      : await makePlaceholderCell(model.label, stats, g, placeholderHeight);
    cells.push(cell);
  }

  const titleHeight = g.title ? g.labelHeight + g.padding : 0;
  const canvasWidth = g.padding + g.columns * (g.cellWidth + g.padding);

  // Lay cells out left→right, top→bottom; each row is as tall as its tallest cell.
  const rows: Cell[][] = [];
  for (let i = 0; i < cells.length; i += g.columns) {
    rows.push(cells.slice(i, i + g.columns));
  }
  const rowHeights = rows.map((row) => Math.max(...row.map((c) => c.height)));
  const canvasHeight =
    titleHeight +
    g.padding +
    rowHeights.reduce((sum, h) => sum + h + g.padding, 0);

  const composites: sharp.OverlayOptions[] = [];

  if (g.title) {
    const titleSvg = Buffer.from(
      svgBanner(canvasWidth, g.labelHeight, g.title, g.labelColor, g.labelFontSize + 4, g.background),
    );
    composites.push({ input: titleSvg, top: g.padding, left: 0 });
  }

  let y = titleHeight + g.padding;
  rows.forEach((row, rowIdx) => {
    let x = g.padding;
    for (const cell of row) {
      composites.push({ input: cell.image, top: y, left: x });
      x += g.cellWidth + g.padding;
    }
    y += rowHeights[rowIdx] + g.padding;
  });

  const canvas = sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: g.background,
    },
  });

  await canvas.composite(composites).png().toFile(paths.grid);
  return paths.grid;
}

async function makeImageCell(
  screenshotPath: string,
  label: string,
  stats: string,
  g: BenchmarkConfig["grid"],
): Promise<Cell> {
  const resized = await sharp(screenshotPath)
    .resize({ width: g.cellWidth, withoutEnlargement: false })
    .png()
    .toBuffer();
  const meta = await sharp(resized).metadata();
  const imgHeight = meta.height ?? Math.round(g.cellWidth * 0.66);
  return composeCell(resized, imgHeight, label, stats, g);
}

async function makePlaceholderCell(
  label: string,
  stats: string,
  g: BenchmarkConfig["grid"],
  height: number,
): Promise<Cell> {
  const placeholder = await sharp({
    create: { width: g.cellWidth, height, channels: 4, background: "#1c1f26" },
  })
    .composite([
      {
        input: Buffer.from(
          svgBanner(g.cellWidth, height, "no output", "#8a8f98", 28, "#1c1f26"),
        ),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();
  return composeCell(placeholder, height, label, stats, g);
}

async function composeCell(
  image: Buffer,
  imgHeight: number,
  label: string,
  stats: string,
  g: BenchmarkConfig["grid"],
): Promise<Cell> {
  // Topbar style: a thin one-line strip across the top of the render (compact).
  if (g.labelStyle === "topbar") {
    const caption = stats ? `${label}   ·   ${stats}` : label;
    const bar = Buffer.from(
      svgTopBar(
        g.cellWidth,
        caption,
        g.labelColor,
        g.labelFontSize,
        g.labelOverlayBg ?? "rgba(10,12,16,0.66)",
      ),
    );
    const cell = await sharp(image)
      .composite([{ input: bar, top: 0, left: 0 }])
      .png()
      .toBuffer();
    return { label, image: cell, width: g.cellWidth, height: imgHeight };
  }

  // Overlay style: render fills the whole cell, label floats in a corner pill.
  if (g.labelStyle === "overlay") {
    const overlay = Buffer.from(
      svgOverlayLabel(
        g.cellWidth,
        imgHeight,
        label,
        stats,
        g.labelColor,
        g.labelFontSize,
        g.labelOverlayBg ?? "rgba(10,12,16,0.62)",
      ),
    );
    const cell = await sharp(image)
      .composite([{ input: overlay, top: 0, left: 0 }])
      .png()
      .toBuffer();
    return { label, image: cell, width: g.cellWidth, height: imgHeight };
  }

  // Banner style: caption strip above the screenshot (label · stats on one line).
  const caption = stats ? `${label}   ·   ${stats}` : label;
  const height = g.labelHeight + imgHeight;
  const labelSvg = Buffer.from(
    svgBanner(g.cellWidth, g.labelHeight, caption, g.labelColor, g.labelFontSize, "#1a1d24"),
  );
  const cell = await sharp({
    create: { width: g.cellWidth, height, channels: 4, background: g.background },
  })
    .composite([
      { input: labelSvg, top: 0, left: 0 },
      { input: image, top: g.labelHeight, left: 0 },
    ])
    .png()
    .toBuffer();
  return { label, image: cell, width: g.cellWidth, height };
}

/** Read a model's result.json, or null if it hasn't been generated yet. */
function loadResult(path: string): GenerationResult | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as GenerationResult;
  } catch {
    return null;
  }
}

/** "12.4s · 3,210 tok" — elapsed time + output (completion) tokens. */
function statsLine(res: GenerationResult | null): string {
  if (!res) return "";
  const parts: string[] = [];
  if (res.elapsedMs != null) parts.push(`${(res.elapsedMs / 1000).toFixed(1)}s`);
  const out = res.usage?.completionTokens ?? res.usage?.totalTokens;
  if (out != null) parts.push(`${groupThousands(out)} tok`);
  return parts.join("   ·   ");
}

function groupThousands(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** A solid banner with centred text, rendered as SVG (sharp rasterises it). */
function svgBanner(
  width: number,
  height: number,
  text: string,
  color: string,
  fontSize: number,
  bg: string,
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="${bg}"/>
  <text x="${width / 2}" y="${height / 2}" fill="${color}"
        font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}"
        font-weight="600" text-anchor="middle" dominant-baseline="central">${escapeXml(
          text,
        )}</text>
</svg>`;
}

/** A thin full-width strip across the top of a cell with one line of text. */
function svgTopBar(
  width: number,
  text: string,
  color: string,
  fontSize: number,
  bg: string,
): string {
  const barH = Math.round(fontSize * 1.7);
  const padX = Math.round(fontSize * 0.7);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${barH}">
  <rect width="100%" height="100%" fill="${bg}"/>
  <text x="${padX}" y="${barH / 2}" fill="${color}"
        font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}"
        font-weight="600" text-anchor="start" dominant-baseline="central">${escapeXml(
          text,
        )}</text>
</svg>`;
}

/**
 * A transparent overlay with a rounded translucent pill in the top-left holding
 * the model name and, on a second line, its run stats (time + output tokens).
 */
function svgOverlayLabel(
  width: number,
  height: number,
  label: string,
  stats: string,
  color: string,
  fontSize: number,
  bg: string,
): string {
  const subFont = Math.round(fontSize * 0.62);
  const padX = Math.round(fontSize * 0.7);
  const padY = Math.round(fontSize * 0.45);
  const lineGap = stats ? Math.round(fontSize * 0.32) : 0;
  const labelW = Math.round(label.length * fontSize * 0.6);
  const statsW = stats ? Math.round(stats.length * subFont * 0.6) : 0;
  const pillW = Math.max(labelW, statsW) + padX * 2;
  const pillH = padY * 2 + fontSize + (stats ? lineGap + subFont : 0);
  const x = Math.round(fontSize * 0.9);
  const y = Math.round(fontSize * 0.9);
  const r = Math.round(Math.min(pillH / 2.4, fontSize));
  const labelY = y + padY + fontSize / 2;
  const statsY = labelY + fontSize / 2 + lineGap + subFont / 2;
  const subColor = mutedColor(color);
  const statsText = stats
    ? `\n  <text x="${x + padX}" y="${statsY}" fill="${subColor}"
        font-family="Helvetica, Arial, sans-serif" font-size="${subFont}"
        font-weight="500" text-anchor="start" dominant-baseline="central">${escapeXml(
          stats,
        )}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect x="${x}" y="${y}" width="${pillW}" height="${pillH}" rx="${r}" ry="${r}" fill="${bg}"/>
  <text x="${x + padX}" y="${labelY}" fill="${color}"
        font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}"
        font-weight="700" text-anchor="start" dominant-baseline="central">${escapeXml(
          label,
        )}</text>${statsText}
</svg>`;
}

/** Dim a hex/named color toward grey for the secondary stats line. */
function mutedColor(color: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return "#b9bec9";
  const n = parseInt(m[1], 16);
  const mix = (c: number) => Math.round(c * 0.72 + 0x88 * 0.28);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `rgb(${r},${g},${b})`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!),
  );
}
