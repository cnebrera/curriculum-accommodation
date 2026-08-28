import yaml from 'js-yaml';

/**
 * Damage-tolerant front-matter parsing (006 FR-410, research R3).
 *
 * A teacher edits these files by hand — that is the point of the vault — so a
 * hand-edit that breaks the structure is our defect, not her mistake. This
 * parser therefore has no failure mode that loses her words.
 */
export interface Repair {
  file?: string;
  what: string;
  /** Written for the teacher, not for a log. */
  message: string;
}

export interface Parsed {
  data: Record<string, unknown>;
  body: string;
  repairs: Repair[];
}

const FM = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontMatter(raw: string, file?: string): Parsed {
  const repairs: Repair[] = [];
  const match = FM.exec(raw);

  if (!match) {
    return { data: {}, body: raw, repairs };
  }

  const [full, block] = match;
  const body = raw.slice(full.length);

  try {
    const loaded = yaml.load(block ?? '');
    if (loaded && typeof loaded === 'object' && !Array.isArray(loaded)) {
      return { data: loaded as Record<string, unknown>, body, repairs };
    }
    repairs.push({
      file,
      what: 'front-matter-not-a-map',
      message: 'La cabecera de este fichero no tenía el formato esperado. He conservado todo el texto tal cual.',
    });
    return { data: {}, body: raw, repairs };
  } catch {
    // Invalid YAML: treat the whole file as prose. Never throw, never drop.
    repairs.push({
      file,
      what: 'front-matter-invalid',
      message: 'No pude leer la cabecera de este fichero, así que lo he tratado entero como texto. No he borrado nada.',
    });
    return { data: {}, body: raw, repairs };
  }
}

/** Serialise back. Only ever called on an explicit action, never on read. */
export function stringifyFrontMatter(data: Record<string, unknown>, body: string): string {
  const keys = Object.keys(data).filter((k) => k !== '_unparsed');
  if (keys.length === 0) return body;
  const clean: Record<string, unknown> = {};
  for (const k of keys) clean[k] = data[k];
  const fm = yaml.dump(clean, { lineWidth: 100, noRefs: true }).trimEnd();
  return `---\n${fm}\n---\n\n${body.replace(/^\n+/, '')}`;
}
