import { describe, it, expect } from 'vitest';
import { parseIR } from '../src/ir/parse.js';
import { renderHTML } from '../src/render/html.js';

/**
 * A worksheet has no code, and a line break is a line break (backlog G75).
 *
 * Found on the first PDF a real model produced. The model indents continuation lines
 * under an exercise — `····*(Este ya está hecho como ejemplo)*` — and in markdown four
 * leading spaces are an indented code block. So the printed sheet carried `<pre><code>`:
 * a monospace face, the emphasis asterisks printed raw, and the line running off the
 * card because `<pre>` does not wrap. Three visible defects, one cause.
 *
 * And two sentences the model wrote on two lines came out as one — «Hoja 1 de 4 Son 2
 * partes…» — because a lone newline is a space in standard markdown. In a sheet built by
 * `one-idea-per-sentence`, the newline is the content.
 */
const sheet = (body: string) => renderHTML(parseIR(`---\nkind: "worksheet"\n---\n\n${body}`));

describe('block content never becomes a code block', () => {
  it('renders an indented continuation as text, with its emphasis', () => {
    const html = sheet('::: {#e1 .exercise data-number="1"}\n3 × 6 = 18\n\n    *(Este ya está hecho como ejemplo.)*\n:::\n');
    expect(html).not.toMatch(/<pre|<code/);
    expect(html).toMatch(/<em>\(Este ya está hecho como ejemplo\.\)<\/em>/);
  });

  it('does not open a code block on a triple-backtick line either', () => {
    const html = sheet('::: {#b1 .explanation}\n```\nno es código, es una hoja\n```\n:::\n');
    expect(html).not.toMatch(/<pre|<code/);
    expect(html).toContain('no es código, es una hoja');
  });

  it('keeps two lines as two lines', () => {
    const html = sheet('::: {#b1 .instruction}\nHoja 1 de 4\nSon 2 partes y 6 ejercicios en total.\n:::\n');
    expect(html).toMatch(/Hoja 1 de 4<br\s*\/?>\s*Son 2 partes/);
  });

  it('does not print the exercise number twice', () => {
    // The model writes the number in the text as well as in the attribute (backlog G74).
    const html = sheet('::: {#e2 .exercise data-number="2"}\n2.  7 × 2 =\n:::\n');
    expect(html).toMatch(/<span class="n">2\.<\/span>/);
    expect(html).not.toMatch(/2\.\s*<\/span>\s*<p>\s*2\./);
    expect(html).not.toMatch(/<ol/);
  });
});
