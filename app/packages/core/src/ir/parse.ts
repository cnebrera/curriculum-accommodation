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
  'assessment','note','reference','figure','scaffold','unsupported',
];

export function createRenderer(): MarkdownIt {
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false });
  md.use(attrs, { allowedAttributes: [/^data-.*$/, 'id', 'class'] });
  for (const name of KNOWN) md.use(container, name, {});
  md.use(container, 'block', {});
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

/** Blocks a learner is meant to read, as opposed to metadata. */
export const learnerFacing = (b: Block): boolean =>
  !b.classes.includes('reference');
