import { existsSync } from "node:fs";
import sharp from "sharp";
import type { BenchmarkConfig, ModelEntry } from "./types.js";
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
    const cell = existsSync(shot)
      ? await makeImageCell(shot, model.label, g)
      : await makePlaceholderCell(model.label, g, placeholderHeight);
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
  g: BenchmarkConfig["grid"],
): Promise<Cell> {
  const resized = await sharp(screenshotPath)
    .resize({ width: g.cellWidth, withoutEnlargement: false })
    .png()
    .toBuffer();
  const meta = await sharp(resized).metadata();
  const imgHeight = meta.height ?? Math.round(g.cellWidth * 0.66);
  return composeCell(resized, imgHeight, label, g);
}

async function makePlaceholderCell(
  label: string,
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
  return composeCell(placeholder, height, label, g);
}

async function composeCell(
  image: Buffer,
  imgHeight: number,
  label: string,
  g: BenchmarkConfig["grid"],
): Promise<Cell> {
  const height = g.labelHeight + imgHeight;
  const labelSvg = Buffer.from(
    svgBanner(g.cellWidth, g.labelHeight, label, g.labelColor, g.labelFontSize, "#1a1d24"),
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

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!),
  );
}
