import { describe, it, expect } from 'vitest';
import { renderHTML, renderODT, draftMark, parseIR, buildSheet } from '../src/index.js';
import { inflateSync } from 'node:zlib';

/**
 * The draft mark, and why composed material says more (002 T016, Principle VII).
 *
 * Everywhere else the mark means «her adaptation has not been reviewed» — there
 * was an original, and the question is whether the changes to it are right.
 * Composed material has no original: nobody has read this content at all.
 *
 * A teacher who reads «pendiente de revisión docente» on a composed sheet will
 * review it the way she reviews the others — checking the adaptation. That is the
 * wrong review, and it is a review that passes.
 */
const adapted = parseIR(['---', 'title: "Ficha"', 'lang: es', '---', '',
  '::: {#b1 .exercise data-from="p1"}', '47 × 8 =', ':::'].join('\n'));

const composed = parseIR(buildSheet({
  title: 'Multiplicar', lang: 'es', objectives: ['multiplicar con llevadas'],
  groups: [{
    objective: 'multiplicar con llevadas',
    instruction: 'Resuelve.',
    accepted: [{ exercise: { expression: '47 × 8' }, answer: '376' }],
  }],
  composedOn: '2026-08-31',
}).markdown);

describe('the mark is derived from the document', () => {
  it('says the ordinary thing about adapted material', () => {
    expect(draftMark(adapted)?.banner).toContain('pendiente de revisión docente');
  });

  it('names the content on composed material', () => {
    const mark = draftMark(composed);
    expect(mark?.banner).toContain('CONTENIDO GENERADO');
    // And tells her which review to do, which is the point of the difference.
    expect(mark?.banner).toContain('no sólo la adaptación');
    expect(mark?.watermark).toContain('CONTENIDO SIN REVISAR');
  });

  it('keeps «no entregar al alumnado» in both', () => {
    expect(draftMark(adapted)?.banner).toContain('no entregar al alumnado');
    expect(draftMark(composed)?.banner).toContain('no entregar al alumnado');
  });

  it('is gone once she has signed it off, generated or not', () => {
    expect(draftMark(composed, true)).toBeNull();
    const signed = parseIR(['---', 'review:', '  signed_off: true', '---', '',
      '::: {#b1 .exercise}', 'x', ':::'].join('\n'));
    expect(draftMark(signed)).toBeNull();
  });
});

describe('both renderers read the same fact', () => {
  it('HTML carries the composed banner and the composed watermark', () => {
    const html = renderHTML(composed);
    expect(html).toContain('CONTENIDO GENERADO');
    // The watermark is per-page: a sheet separated from the first one still says
    // what it is.
    expect(html).toContain('content:"BORRADOR — CONTENIDO SIN REVISAR"');
  });

  it('ODF carries it too, as the first paragraph', () => {
    const text = contentXml(renderODT(composed));
    expect(text).toContain('CONTENIDO GENERADO');
    // First, before any block: a mark below the exercises is a mark she scrolls
    // past.
    expect(text.indexOf('CONTENIDO GENERADO')).toBeLessThan(text.indexOf('47'));
  });

  it('neither marks a signed-off document', () => {
    expect(renderHTML(composed, { signedOff: true })).not.toContain('BORRADOR');
    expect(contentXml(renderODT(composed, { signedOff: true }))).not.toContain('BORRADOR');
  });
});

/** `content.xml` out of the store-only ZIP, so the assertions are on real output. */
function contentXml(odt: Uint8Array): string {
  const buf = Buffer.from(odt);
  const name = Buffer.from('content.xml');
  // Local file headers only; the store-only writer emits no data descriptors.
  for (let i = 0; i < buf.length - 30; i++) {
    if (buf.readUInt32LE(i) !== 0x04034b50) continue;
    const method = buf.readUInt16LE(i + 8);
    const size = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    const start = i + 30 + nameLen + extraLen;
    if (!buf.subarray(i + 30, i + 30 + nameLen).equals(name)) continue;
    const data = buf.subarray(start, start + size);
    return (method === 0 ? data : inflateSync(data)).toString('utf8');
  }
  throw new Error('content.xml not found in the ODT');
}
