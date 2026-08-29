import type { Block, BlockClass, IRDocument, Notice } from '../ir/types.js';
import type { ExtractedBlock, ExtractedPage } from './schema.js';

/**
 * Extracted pages → IR (008 T005, FR-615).
 *
 * Deterministic, offline, in the core — and **one function for both paths**. The
 * vision path and the digital path both produce `ExtractedPage[]`, so this is
 * what makes "nothing downstream knows which path ran" true rather than
 * aspirational. `extraction.test.ts` asserts the two produce byte-identical IR
 * from the same content, which is the only way that claim stays true.
 *
 * Two things must survive verbatim, and both are Principle III:
 *
 * - **The printed exercise number**, into `data-number`. A renumbered exercise
 *   reads perfectly plausibly and only surfaces when a child asks about number 4.
 * - **`[UNREADABLE: …]` in place.** Filling it in is the most dangerous thing
 *   this pipeline could do, so nothing here tidies it away.
 */

/**
 * Extraction classes → IR classes.
 *
 * The two vocabularies differ on purpose: extraction describes *what is printed*
 * (a heading, a caption), the IR describes *what it is for* (an explanation, a
 * reference). `docs/ir.md` owns the second list, and mapping between them here
 * keeps the model's vocabulary out of the downstream contract.
 */
const CLASS_MAP: Record<ExtractedBlock['class'], BlockClass> = {
  heading: 'explanation',
  paragraph: 'explanation',
  instruction: 'instruction',
  exercise: 'exercise',
  aside: 'note',
  figure: 'figure',
  table: 'reference',
  caption: 'reference',
};

export interface ToIROptions {
  /** `photos` | `pdf-scanned` | `pdf-digital` | `docx` | `pasted`. */
  source: string;
  /** Front matter the caller already knows: subject, language, title. */
  frontMatter?: Record<string, unknown>;
}

export function pagesToIR(pages: readonly ExtractedPage[], opts: ToIROptions): IRDocument {
  const blocks: Block[] = [];
  let line = 1;

  for (const page of [...pages].sort((a, b) => a.page - b.page)) {
    for (const b of page.blocks) {
      const notices: Notice[] = [];
      const text = b.text ?? '';

      /*
       * The unreadable marker becomes a notice as well as staying in the text.
       * Both, not either: the text keeps it so nothing downstream can render a
       * gap as if it were prose, and the notice is what puts it at the top of
       * the verification screen.
       */
      for (const quote of unreadableMarkers([text, b.short ?? '', b.long ?? ''])) {
        notices.push({
          kind: 'unreadable',
          quote,
          message: 'Esto no se ha podido leer de la foto. Escríbelo tú mirando el original.',
        });
      }

      const attrs: Record<string, string> = {
        'data-page': String(page.page),
        // Traceability (Principle VI): which page and which extracted block this
        // came from, so a notice can be located on the paper she is holding.
        'data-source-id': b.id,
      };

      // Verbatim. Never parsed, never renumbered, never zero-padded.
      if (b.number) attrs['data-number'] = b.number;

      if (b.class === 'figure') {
        if (b.role) attrs['data-role'] = b.role;
        if (b.short) attrs['data-alt'] = b.short;
        if (b.long) attrs['data-longdesc'] = b.long;
      }
      if (b.class === 'heading') attrs['data-heading'] = 'true';
      if (b.class === 'caption') attrs['data-caption'] = 'true';
      if (b.class === 'table') attrs['data-table'] = 'true';

      blocks.push({
        // Page-qualified, so two pages using `b1` do not collide — which is why
        // the validator only requires ids unique *within* a page.
        id: `p${page.page}-${b.id}`,
        classes: [CLASS_MAP[b.class]],
        attrs,
        content: b.class === 'figure' ? (b.long ?? b.short ?? '') : text,
        line: line++,
        notices,
      });
    }
  }

  return {
    frontMatter: {
      ...(opts.frontMatter ?? {}),
      source: opts.source,
      extraction: {
        // False until she confirms every page. Derived downstream and never set
        // here: FR-608 gates adaptation on this, and a field written at
        // conversion time is a field something will eventually write for
        // convenience.
        verified: false,
        pages: pages.length,
      },
    },
    blocks,
    notices: pages.flatMap((p) => p.notes.map((n): Notice => ({
      kind: 'unreadable',
      quote: n,
      // The model's own note about what it ignored or could not decide. Not an
      // unreadable strictly, but it belongs in the same "look at this" channel
      // and the IR's notice kinds are a closed set owned by `docs/ir.md`.
      message: 'El programa ha dejado constancia de esto al leer la página.',
    }))),
  };
}

function unreadableMarkers(texts: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of texts) {
    for (const m of t.matchAll(/\[UNREADABLE(?::\s*([^\]]*))?\]/g)) {
      out.push(m[1]?.trim() || 'sin detalle');
    }
  }
  return out;
}

/**
 * IR back to Pandoc-flavoured markdown, so `parseIR` can read what this wrote.
 *
 * The round trip matters more than it looks: the IR on disk is the interchange
 * format and a teacher may hand-edit it, so what this writes must be exactly
 * what the existing parser reads. `extraction.test.ts` asserts the round trip.
 */
export function irToMarkdown(doc: IRDocument): string {
  const fm = Object.entries(doc.frontMatter)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n');

  const body = doc.blocks.map((b) => {
    const attrs = Object.entries(b.attrs)
      .map(([k, v]) => `${k}="${v.replace(/"/g, '&quot;')}"`)
      .join(' ');
    const spec = [`#${b.id}`, ...b.classes.map((c) => `.${c}`), attrs].filter(Boolean).join(' ');
    return `::: {${spec}}\n${b.content}\n:::`;
  }).join('\n\n');

  return `---\n${fm}\n---\n\n${body}\n`;
}
