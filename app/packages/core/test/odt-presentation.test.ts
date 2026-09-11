import { describe, it, expect } from 'vitest';
import { parseIR } from '../src/ir/parse.js';
import { renderODT } from '../src/render/odt.js';
import { presentationFor } from '../src/render/html.js';

/**
 * Que el documento editable deje de ser **menos accesible** que el impreso
 * (`040` FR-3801, SC-3801).
 *
 * ## Lo que estaba mal, medido
 *
 * `render/odt.ts` fijaba `fo:font-size="12pt"` en el estilo del cuerpo, y `OdtOptions` no
 * tenía ningún campo de presentación: no había forma de pasarle una. Así que un alumno
 * `PER-V: 2` —al que `presentationFor` da 24pt— recibía:
 *
 * | | Hoja impresa | Documento editable |
 * |---|---|---|
 * | Cuerpo | 24pt | **12pt** |
 *
 * **La mitad exacta.** Y no es un caso raro: es el fichero que ella abre para cambiar dos
 * palabras antes de imprimir, así que la accesibilidad que recibía el alumno dependía de
 * por qué botón pasó ella. Eso no es estética, es el Principio IV roto llegando como
 * divergencia en vez de como código duplicado.
 */
const doc = () => parseIR(['---', 'signed_off: true', '---', '',
  '::: {#e1 .exercise data-number="1"}', '1. Haz esto.', ':::', '',
  '::: {#e2 .exercise data-number="2"}', '2. Y esto.', ':::'].join('\n'));

const odt = (levels: Parameters<typeof presentationFor>[0]): string =>
  Buffer.from(renderODT(doc(), { presentation: presentationFor(levels) }))
    .toString('latin1');

/** El estilo del cuerpo, que es de donde hereda todo lo demás. */
const cuerpo = (x: string): string =>
  x.slice(x.indexOf('style:name="Cuerpo"')).slice(0, 300);

describe('el editable recibe la misma presentación que la hoja', () => {
  /**
   * **El caso que protege todo lo que ya existe**: un alumno sin barreras de presentación
   * recibe exactamente el documento de antes de esta feature.
   */
  it('sin barreras, sale como salía: 12pt', () => {
    expect(cuerpo(odt({}))).toContain('fo:font-size="12pt"');
  });

  it('quien ve muy poco recibe aquí el mismo cuerpo que en su hoja', () => {
    const p = presentationFor({ 'PER-V': 2 });
    expect(p.fontSize, 'la hoja le da esto').toBe('24pt');
    expect(cuerpo(odt({ 'PER-V': 2 })), 'y el editable tiene que darle lo mismo')
      .toContain('fo:font-size="24pt"');
  });

  it('quien ve con dificultad recibe el cuerpo intermedio', () => {
    expect(cuerpo(odt({ 'PER-V': 1 }))).toContain('fo:font-size="18pt"');
  });

  it('quien descifra con esfuerzo recibe la doble interlínea', () => {
    expect(cuerpo(odt({ DEC: 1 }))).toContain('fo:line-height="200%"');
  });

  it('y el aire entre letras, convertido a una unidad que ODF entiende', () => {
    const x = cuerpo(odt({ DEC: 1 }));
    expect(x).toMatch(/fo:letter-spacing="[0-9.]+pt"/);
  });

  it('la tinta de máximo contraste llega', () => {
    expect(cuerpo(odt({ 'PER-V': 2 }))).toContain('fo:color="#000000"');
  });

  it('una tarea por página es un salto de página de verdad', () => {
    expect(odt({ COG: 2 })).toContain('fo:break-before="page"');
    expect(odt({}), 'y sin el eje, ningún salto').not.toContain('fo:break-before="page"');
  });

  /**
   * **Las dos ausencias, asertadas como decisión y no como olvido.**
   *
   * La longitud de línea no llega porque este documento **no define su página**: no hay
   * ningún `page-layout` en él, toma la configuración del procesador de ella. Imponerle
   * una sería pisarle su ajuste para conseguir un efecto aproximado, en el fichero cuya
   * razón de ser es que ella lo controle.
   *
   * El espaciado entre palabras no llega porque ODF no tiene la propiedad, y aproximarlo
   * con espacios de más corrompería el texto que ella edita.
   *
   * Se asertan para que el día que alguien las añada tenga que leer este párrafo.
   */
  it('no impone una página, ni siquiera para acortar la línea', () => {
    const p = presentationFor({ 'PER-V': 2 });
    expect(p.measure, 'la hoja sí acorta la línea').toBe('44ch');
    expect(odt({ 'PER-V': 2 }), 'el editable no puede imponerle su página')
      .not.toContain('page-layout');
  });

  it('no toca el texto para separar palabras', () => {
    const p = presentationFor({ DEC: 1 });
    expect(p.wordSpacing, 'la hoja sí lo separa').toBeDefined();
    expect(odt({ DEC: 1 })).not.toContain('word-spacing');
  });
});
