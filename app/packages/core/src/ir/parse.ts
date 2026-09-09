import MarkdownIt from 'markdown-it';
import container from 'markdown-it-container';
import attrs from 'markdown-it-attrs';
import { parseFrontMatter } from '../vault/parse.js';
import type { Block, BlockClass, IRDocument } from './types.js';

/**
 * IR parsing without Pandoc.
 *
 * docs/ir.md chose Pandoc-flavoured markdown partly because Pandoc converts it.
 * The application cannot ship Pandoc (006 FR-425), so the subset is implemented
 * directly — see research R12. The format still earns its place on the other
 * grounds: it round-trips, a teacher can read it, and its diffs are legible.
 */
const KNOWN: BlockClass[] = [
  'explanation','example','instruction','exercise',
  'assessment','note','reference','figure','scaffold','unsupported','report-notes',
];

export function createRenderer(): MarkdownIt {
  /*
   * `breaks: true` — una línea nueva es una línea nueva (backlog G75).
   *
   * `one-idea-per-sentence` y `chunk-the-prose` existen para poner una idea por línea, y
   * en markdown estándar un salto de línea suelto es un espacio: dos frases que el modelo
   * escribió en dos líneas salían pegadas — «Hoja 1 de 4 Son 2 partes y 6 ejercicios».
   * En una hoja para un niño el salto de línea es contenido, no formato.
   */
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false, breaks: true });
  /*
   * Una hoja no tiene código (backlog G75).
   *
   * Cuatro espacios de sangría son, en markdown, un bloque de código. Un modelo real
   * sangra las líneas de continuación bajo un ejercicio —`····*(Este ya está hecho como
   * ejemplo)*`— y eso llegaba al papel como `<pre><code>`: monoespaciada, los asteriscos
   * sin renderizar y la línea saliéndose de la tarjeta porque `<pre>` no parte. Tres
   * defectos visibles en el PDF firmado, una causa.
   *
   * Se quita la regla y no se le pide al modelo que no sangre: es determinista, y no hay
   * ningún material escolar en el que una sangría deba convertirse en código. Lo mismo
   * para las vallas de tres acentos, y para el código en línea: con `fence` apagado, unos
   * acentos abiertos en una línea y cerrados dos más abajo se emparejan como `<code>` en
   * línea, que es el mismo defecto con otra etiqueta. En este dominio no hay código:
   * ni sangrado, ni vallado, ni en línea.
   */
  md.disable(['code', 'fence', 'backticks']);
  // Loosely typed on purpose; see types/markdown-it-plugins.d.ts.
  const use = md.use.bind(md) as (plugin: unknown, ...args: unknown[]) => MarkdownIt;
  use(attrs, { allowedAttributes: [/^data-.*$/, 'id', 'class'] });
  for (const name of KNOWN) use(container, name, {});
  use(container, 'block', {});
  return md;
}

/** `::: {#e4 .exercise data-number="4"}` … `:::` */
const OPEN = /^:::+\s*\{([^}]*)\}\s*$/;
const CLOSE = /^:::+\s*$/;

function parseAttrList(spec: string): { id: string; classes: BlockClass[]; attrs: Record<string, string> } {
  let id = '';
  const classes: BlockClass[] = [];
  const attrs: Record<string, string> = {};
  const re = /([#.][\w:-]+)|([\w-]+)\s*=\s*"([^"]*)"|([\w-]+)\s*=\s*(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(spec)) !== null) {
    if (m[1]) {
      const tok = m[1];
      if (tok.startsWith('#')) id = tok.slice(1);
      else classes.push(tok.slice(1) as BlockClass);
    } else if (m[2] !== undefined) attrs[m[2]] = m[3] ?? '';
    else if (m[4] !== undefined) attrs[m[4]] = m[5] ?? '';
  }
  return { id, classes, attrs };
}

export function parseIR(raw: string, file?: string): IRDocument {
  const { data, body } = parseFrontMatter(raw, file);
  const lines = body.split(/\r?\n/);
  const blocks: Block[] = [];

  let open: { start: number; spec: string } | null = null;
  let buffer: string[] = [];
  let anonymous = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const openMatch = OPEN.exec(line);
    if (openMatch && !open) {
      open = { start: i + 1, spec: openMatch[1] ?? '' };
      buffer = [];
      continue;
    }
    if (open && CLOSE.test(line)) {
      const { id, classes, attrs } = parseAttrList(open.spec);
      blocks.push({
        id: id || `b${++anonymous}`,
        classes: classes.length ? classes : ['explanation'],
        attrs,
        content: buffer.join('\n').trim(),
        line: open.start,
        notices: [],
      });
      open = null;
      buffer = [];
      continue;
    }
    if (open) buffer.push(line);
  }

  // An unclosed fence is a hand-edit, not a crash: keep what it held.
  if (open) {
    const { id, classes, attrs } = parseAttrList(open.spec);
    blocks.push({
      id: id || `b${++anonymous}`,
      classes: classes.length ? classes : ['explanation'],
      attrs,
      content: buffer.join('\n').trim(),
      line: open.start,
      notices: [],
    });
  }

  return { frontMatter: data, blocks, notices: [] };
}

/**
 * Blocks a learner is meant to read, as opposed to metadata.
 *
 * `report-notes` is the model talking to the teacher about the adaptation; it
 * must never reach the sheet a child holds in a classroom.
 */
export const learnerFacing = (b: Block): boolean =>
  !b.classes.includes('reference') && !b.classes.includes('report-notes');

/**
 * Which block classes a document actually contains (012 T005).
 *
 * Derived, never stored: a document's classes are a fact about the document, and
 * a stored copy is one a hand-edit in Obsidian could make false — which the vault
 * explicitly permits.
 *
 * `report-notes` is excluded. It is the model's channel into the report and never
 * learner-facing, so a recipe scoped to it would be a recipe about our own
 * plumbing.
 */
export function blockClassesIn(doc: { blocks: Array<{ classes: string[] }> }): string[] {
  const seen = new Set<string>();
  for (const b of doc.blocks) {
    for (const c of b.classes) if (c !== 'report-notes') seen.add(c);
  }
  return [...seen].sort();
}
