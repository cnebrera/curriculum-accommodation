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

/**
 * The vehicular mark's own descriptor (`033` T006, FR-3103).
 *
 * Read from the same file by the same parser and returned **separately**, never as an
 * eleventh `AxisDef`. That is the whole point of the split: the ten are barriers that
 * travel with a child, and the mark is a state with a date on which it stops being true.
 * An eleventh entry would flow into every `AXES.map` in the application — the prompt's
 * profile line, the presentation map the renderer gets, the axis grid — and each of those
 * would then be describing a transition as a barrier.
 *
 * `null` when the corpus has no section for it: the editor then shows nothing rather than
 * a code, which is the same rule `coversAllAxes` enforces for the axes.
 */
export const MARK_KEY = 'VEH';

export function parseMarkDef(raw: string, path?: string): AxisDef | null {
  const { body } = parseFrontMatter(raw, path);
  let current: { name: string; levels: string[] } | null = null;

  for (const line of body.split(/\r?\n/)) {
    const h = HEADING.exec(line);
    if (h) {
      if (h[1] === MARK_KEY) { current = { name: h[2]!, levels: [] }; continue; }
      if (current) break;   // a different section began: the mark's is over
      continue;
    }
    if (!current) continue;
    const l = LEVEL.exec(line.trim());
    if (l) current.levels[Number(l[1])] = l[2]!;
    else if (line.startsWith('## ')) break;
  }

  if (!current || current.levels.length !== 4) return null;
  return {
    // Typed as `Axis` for the editor's sake, and it is deliberately not in `AXES` —
    // `coversAllAxes` below would fail if it were, which is the check that keeps them apart.
    key: MARK_KEY as unknown as Axis,
    name: current.name,
    levels: current.levels as [string, string, string, string],
  };
}

/** True when the corpus covers every axis the schema knows about. A partial
 *  file would leave an axis unlabelled on screen, which is worse than a code. */
export const coversAllAxes = (defs: readonly AxisDef[]): boolean =>
  AXIS_KEYS.every((k) => defs.some((d) => d.key === k));
