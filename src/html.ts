/**
 * Models don't always return a bare HTML document — they often wrap it in a
 * ```html fenced block or add prose before/after. This pulls out the best-guess
 * HTML document from a raw completion.
 */
export function extractHtml(raw: string): string | null {
  if (!raw) return null;

  // 1) Prefer an explicit ```html ... ``` fenced block.
  const fenced = raw.match(/```(?:html|HTML)\s*\n([\s\S]*?)```/);
  if (fenced && fenced[1].trim()) return fenced[1].trim();

  // 2) Any fenced block that looks like a full document.
  const anyFence = [...raw.matchAll(/```[a-zA-Z]*\s*\n([\s\S]*?)```/g)];
  for (const m of anyFence) {
    if (/<!doctype html|<html[\s>]/i.test(m[1])) return m[1].trim();
  }

  // 3) Raw text from the first <!doctype/<html to the last </html>.
  const start = raw.search(/<!doctype html|<html[\s>]/i);
  if (start !== -1) {
    const endMatch = raw.toLowerCase().lastIndexOf("</html>");
    const end = endMatch !== -1 ? endMatch + "</html>".length : raw.length;
    return raw.slice(start, end).trim();
  }

  // 4) Last resort: a chunk that at least contains some body-ish tags.
  if (/<(body|div|section|main|header)[\s>]/i.test(raw)) return raw.trim();

  // 5) The model returned a bare scene fragment with no document shell —
  //    e.g. just a <script type="module"> (or <canvas>/<style>). Wrap it in a
  //    minimal HTML document so it still renders; the importmap injects into
  //    the <head> we add here.
  const tag = raw.search(/<(?:script|canvas|style)[\s>]/i);
  if (tag !== -1) {
    return (
      `<!doctype html>\n<html>\n<head><meta charset="utf-8"></head>\n<body>\n` +
      raw.slice(tag).trim() +
      `\n</body>\n</html>`
    );
  }

  return null;
}
