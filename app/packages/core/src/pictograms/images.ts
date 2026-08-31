/**
 * Pictogram ids → embeddable images (018 T020, FR-1615).
 *
 * In `core` and reader-injected, like `readSet`, for the reason the Electron
 * boundary test enforces: which paths may be read is a decision for the shell, and
 * *how an id becomes a data URI* is logic that should be testable without a
 * directory.
 *
 * ## Embedded, never linked
 *
 * A sheet emailed to a colleague who does not have the set must still show the
 * pictures. And a `file://` path would put where her set lives into a document she
 * sends — which is a small privacy leak in a project whose whole premise is that
 * nothing about her learners leaves the machine unasked.
 *
 * ## An id with no file is simply absent
 *
 * No throw, no placeholder URI. The renderer draws a **named gap** (FR-1616), so a
 * moved or renumbered set degrades the sheet rather than failing it — and the id it
 * wanted is still in `data-picto`, so the gap is diagnosable.
 */

export interface ImageReader {
  list: (dir: string) => Promise<string[]>;
  readBytes: (path: string) => Promise<Uint8Array | null>;
}

const TYPES: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  svg: 'image/svg+xml', webp: 'image/webp',
};

/** `2483.png` → `{ id: '2483', type: 'image/png' }`, or null for anything else. */
export function imageName(name: string): { id: string; type: string } | null {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return null;
  const type = TYPES[name.slice(dot + 1).toLowerCase()];
  return type ? { id: name.slice(0, dot), type } : null;
}

export async function loadImages(
  root: string, ids: readonly string[], reader: ImageReader,
  toBase64: (bytes: Uint8Array) => string,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const wanted = new Set(ids);
  if (wanted.size === 0) return out;

  const byId = new Map<string, { name: string; type: string }>();
  for (const name of await reader.list(root)) {
    const parsed = imageName(name);
    if (parsed && wanted.has(parsed.id)) byId.set(parsed.id, { name, type: parsed.type });
  }

  for (const id of wanted) {
    const found = byId.get(id);
    if (!found) continue;
    const bytes = await reader.readBytes(`${root}/${found.name}`);
    if (!bytes) continue;
    out.set(id, `data:${found.type};base64,${toBase64(bytes)}`);
  }

  return out;
}
