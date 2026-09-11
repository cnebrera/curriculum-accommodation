import { describe, it, expect } from 'vitest';
import { buildReport } from '../src/report/index.js';
import { parseIR } from '../src/ir/parse.js';

/**
 * Que la numeración se pueda **comprobar** y no sólo afirmar (`039` FR-3709, backlog G69).
 *
 * ## El pase real que produjo esto
 *
 * Una hoja pasó las tres puertas y su informe decía, arriba del todo: «no he tocado la
 * exigencia curricular, **la numeración original**». Y la hoja ponía «**1. Resuelto de
 * ejemplo:** 3 × 6 = 18»: el ejercicio 1 había dejado de ser un ejercicio, así que el niño
 * resolvía cinco cosas de seis.
 *
 * La frase se construía entera desde `kind.forbids` —desde el corpus del tipo de
 * material— y **nada la comprobaba**. Se quitó la afirmación, que era media cosa. Lo que
 * faltaba es lo otro: `ReportInput` sólo recibía el documento adaptado, así que **no
 * existía nada contra lo que comprobar**.
 *
 * Con el original delante, «todo `data-number` del origen sigue encabezando una tarea» es
 * determinista — y deja de depender de que el modelo lo cuente, que es justo lo que falló.
 */
const doc = (...blocks: string[]) => parseIR(['---', '---', '', ...blocks].join('\n'));

const ex = (n: string, id = `e${n}`) =>
  `::: {#${id} .exercise data-number="${n}"}\n${n}. Haz esto.\n:::\n`;

describe('la numeración del original se comprueba, no se afirma', () => {
  it('calla cuando no hay original: sin evidencia, no hay afirmación', () => {
    const md = buildReport({ adapted: doc(ex('1'), ex('2')) } as Parameters<typeof buildReport>[0]).markdown;
    expect(md.toLowerCase()).not.toContain('dejó de encabezar');
  });

  it('calla cuando toda la numeración sigue encabezando una tarea', () => {
    const md = buildReport({
      adapted: doc(ex('1'), ex('2')), original: doc(ex('1'), ex('2')),
    } as Parameters<typeof buildReport>[0]).markdown;
    expect(md.toLowerCase()).not.toContain('dejó de encabezar');
  });

  /**
   * **El caso del pase real.** El 1 sigue en la hoja y ya no es una tarea: vive dentro de
   * un `.scaffold` como ejemplo resuelto. Buscar el número no basta — está — y por eso la
   * comprobación es «encabeza una tarea» y no «aparece».
   */
  it('avisa cuando un número dejó de encabezar una tarea, aunque siga en la hoja', () => {
    const md = buildReport({
      adapted: doc('::: {#s1 .scaffold}\n1. Resuelto de ejemplo: 3 × 6 = 18\n:::\n', ex('2')),
      original: doc(ex('1'), ex('2')),
    } as Parameters<typeof buildReport>[0]).markdown;
    expect(md).toContain('1');
    expect(md.toLowerCase()).toContain('dejó de encabezar');
  });

  it('avisa cuando un número desaparece del todo', () => {
    const md = buildReport({
      adapted: doc(ex('2')), original: doc(ex('1'), ex('2')),
    } as Parameters<typeof buildReport>[0]).markdown;
    expect(md.toLowerCase()).toContain('dejó de encabezar');
  });

  /**
   * Partir un ítem en `4a`/`4b` es legítimo y es lo que la regla dura 7 prescribe. El
   * número original sigue encabezando tareas — dos — y eso **no** es un aviso.
   */
  it('no avisa cuando un número se extiende en 4a y 4b, que es lo prescrito', () => {
    const md = buildReport({
      adapted: doc(ex('4a', 'e4a'), ex('4b', 'e4b')), original: doc(ex('4')),
    } as Parameters<typeof buildReport>[0]).markdown;
    expect(md.toLowerCase()).not.toContain('dejó de encabezar');
  });
});
