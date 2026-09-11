import { describe, it, expect } from 'vitest';
import { buildReport } from '../src/report/index.js';
import { parseIR } from '../src/ir/parse.js';

/**
 * El canal por el que una adaptación que no le toca decidir al sistema llega a ella
 * (`039` FR-3705…FR-3708).
 *
 * ## Lo que estaba roto, y eran tres cosas y no una
 *
 * `recipes/core/exam-access-not-difficulty.md` tiene dos listas, y de la segunda dice:
 * «no está prohibida, **no es tuya la decisión. Márcalo y para**». El canal para marcar
 * existía —`flaggedSignificant`— y **ningún llamador de producción lo usaba**, así que la
 * instrucción no tenía dónde marcar.
 *
 * Y aunque lo hubiera tenido, no servía:
 *
 * 1. Era `string[]`, sin sitio para separar el motivo de la propuesta.
 * 2. Se renderizaba **dentro de «Lo que NO he hecho»**, donde una propuesta se lee como
 *    una acción ya tomada.
 * 3. Y las notas se aplanan (`notes.ts:50`, `.replace(/\s+/g, ' ')`), así que una pregunta
 *    de examen reescrita —que son varias líneas— salía como un párrafo corrido, inservible
 *    para lo único que sirve: copiarla.
 *
 * Los tres son necesarios y ninguno basta. Un texto perfecto dentro de «lo que no he
 * hecho» se sigue leyendo como hecho.
 */
const ir = () => parseIR(['---', '---', '',
  '::: {#e4 .assessment data-number="4" data-from="e4" data-recipe="how-much-at-once@1"'
  + ' data-axis="COG:2"}',
  'Explica dos consecuencias de la deforestación.', ':::'].join('\n'));

const build = (extra: object): string =>
  buildReport({ adapted: ir(), ...extra } as Parameters<typeof buildReport>[0]).markdown;

describe('una decisión que no es del sistema llega entera a quien la toma', () => {
  it('no aparece dentro de «Lo que NO he hecho»', () => {
    const md = build({
      escalated: [{ what: 'Partir la pregunta 4 en 4a y 4b',
        why: 'En un examen cambia lo que se mide.' }],
    });
    const notDone = md.split('## Lo que NO he hecho')[1] ?? '';
    expect(notDone, 'una decisión pendiente leída como acción no tomada')
      .not.toContain('Partir la pregunta 4');
  });

  it('tiene su propio apartado, y dice de quién es la decisión', () => {
    const md = build({
      escalated: [{ what: 'Partir la pregunta 4 en 4a y 4b',
        why: 'En un examen cambia lo que se mide.' }],
    });
    expect(md).toContain('Partir la pregunta 4');
    expect(md).toContain('En un examen cambia lo que se mide.');
  });

  /**
   * **La aserción que justifica el cambio de tipo.** Una pregunta de examen reescrita son
   * varias líneas, y el valor entero de entregársela redactada es que la pueda copiar.
   */
  it('una propuesta de tres líneas llega con sus tres líneas', () => {
    const propuesta = '4a. Escribe **un** ejemplo de ser vivo autótrofo.\n'
      + '4b. Escribe **un** ejemplo de ser vivo heterótrofo.\n'
      + 'Puedes usar el libro para las dos.';
    const md = build({
      escalated: [{ what: 'Partir la pregunta 4', why: 'Cambia lo que se mide.',
        proposal: propuesta }],
    });
    for (const linea of propuesta.split('\n')) {
      expect(md, `se perdió la línea «${linea}»`).toContain(linea);
    }
  });

  it('sin escaladas, el apartado no aparece — uno vacío enseña a saltárselo', () => {
    expect(build({}).toLowerCase()).not.toContain('lo decides tú');
  });

  /**
   * Hay adaptaciones que se escalan y no se pueden redactar: «reducir el número de ítems»
   * no tiene un texto que proponer. Una propuesta obligatoria invitaría a inventar una.
   */
  it('una escalada sin propuesta es legítima y no inventa un texto', () => {
    const md = build({
      escalated: [{ what: 'Reducir el número de ítems', why: 'Regla dura 5.' }],
    });
    expect(md).toContain('Reducir el número de ítems');
    expect(md).toContain('Regla dura 5.');
  });

  it('la hoja se hizo sin la adaptación: escalar no es aplicarla con aviso', () => {
    const r = buildReport({ adapted: ir(),
      escalated: [{ what: 'Añadir un ejemplo resuelto', why: 'Andamiar un examen es contestarlo.' }],
    } as Parameters<typeof buildReport>[0]);
    expect(r.decisions.some((d) => JSON.stringify(d).includes('ejemplo resuelto')),
      'una escalada no puede aparecer como algo que se hizo').toBe(false);
  });
});
