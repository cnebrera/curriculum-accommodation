import { parseFrontMatter } from '../vault/parse.js';
import { AXES as AXIS_KEYS, type Axis } from '../vault/schema.js';

/**
 * The axis descriptors, read from the corpus (spec 010 T014).
 *
 * They used to be a literal in `AxisEditor.tsx`. Calibration guidance about
 * children — *"pierde el hilo con más de tres cosas"* — is pedagogical
 * judgement, and Principle I says it lives where a teacher can correct it. This
 * closes `006` T096.
 *
 * Deterministic parsing, no model, per Principle II.
 */
export interface AxisDef {
  key: Axis;
  /** Her words, not the axis code. She never sees "PER-V". */
  name: string;
  /** Observable behaviour at 0, 1, 2, 3. */
  levels: [string, string, string, string];
}

const HEADING = /^###\s+`([A-Z-]+)`\s*·\s*(.+?)\s*$/;
const LEVEL = /^([0-3])\.\s+(.+?)\s*$/;

export function parseAxisDefs(raw: string, path?: string): AxisDef[] {
  const { body } = parseFrontMatter(raw, path);
  const out: AxisDef[] = [];
  let current: { key: string; name: string; levels: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    if (current.levels.length === 4 && (AXIS_KEYS as readonly string[]).includes(current.key)) {
      out.push({
        key: current.key as Axis,
        name: current.name,
        levels: current.levels as [string, string, string, string],
      });
    }
    current = null;
  };

  for (const line of body.split(/\r?\n/)) {
    const h = HEADING.exec(line);
    if (h) { flush(); current = { key: h[1]!, name: h[2]!, levels: [] }; continue; }
    if (!current) continue;
    const l = LEVEL.exec(line.trim());
    if (l) current.levels[Number(l[1])] = l[2]!;
    else if (line.startsWith('## ')) flush();
  }
  flush();
  return out;
}

/** True when the corpus covers every axis the schema knows about. A partial
 *  file would leave an axis unlabelled on screen, which is worse than a code. */
export const coversAllAxes = (defs: readonly AxisDef[]): boolean =>
  AXIS_KEYS.every((k) => defs.some((d) => d.key === k));
