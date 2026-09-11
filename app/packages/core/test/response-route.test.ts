import { describe, it, expect } from 'vitest';
import { parseIR } from '../src/ir/parse.js';
import { renderHTML } from '../src/render/html.js';
import { renderODT } from '../src/render/odt.js';

/**
 * Que la vía de respuesta llegue al papel (`039` FR-3701…FR-3704).
 *
 * ## Lo que estaba roto, medido antes de escribir esto
 *
 * La cadena existía **casi entera**: `profile.response` en el esquema del alumno,
 * `prompt/adapt.ts:318` metiéndolo en el prompt, `recipes/core/response-route.md`
 * gobernándolo con `MOT>=2`, y `data-response` documentado en `docs/ir.md` con ocho
 * valores. Faltaba el último eslabón: **nadie leía `data-response`**.
 *
 * El espacio de respuesta salía de otro atributo, `data-answer-space`, que **sólo escribe
 * la vía de composición**. Así que en una hoja **adaptada** no había espacio de respuesta
 * en absoluto — y la receta le decía al modelo «quita las rayas» cuando no había rayas que
 * quitar. Un no-op desde que se escribió.
 *
 * ## Y por qué esto no mira ningún eje
 *
 * `MOT` dice que **hay** una barrera, no **cuál** es la salida. La receta lo nombra como
 * anti-patrón con su ejemplo: un alumno con parálisis cerebral, uno con la muñeca rota y
 * uno con disgrafía «comparten el eje y no comparten ninguna solución». La salida la
 * escribe ella en `profile.response`, el modelo la aplica, y llega al papel **por el
 * documento**.
 *
 * Así que el renderizador lee el documento y nada más — que además es la forma más barata
 * de que `007` FR-506 siga siendo verdad: no hay nada nuevo que impedirle ver.
 */
/**
 * El marcado, **sin la hoja de estilo**.
 *
 * `renderHTML` incrusta el CSS, que define `.answer-space` siempre, así que un
 * `not.toContain('answer-space')` sobre el HTML entero mira el sitio equivocado y falla
 * pase lo que pase. Es la misma trampa que midió `038`: el `<style>` ensucia cualquier
 * comprobación por subcadena.
 */
const render = (body: string): string =>
  renderHTML(parseIR(`---\ndraft: false\nsigned_off: true\n---\n\n${body}\n`))
    .replace(/<style[\s\S]*?<\/style>/g, '');

const block = (attrs: string): string =>
  `::: {#e1 .exercise${attrs ? ' ' + attrs : ''}}\n¿Por qué las plantas necesitan luz?\n:::`;

/** Las rayas son `<span class="rule">`, y contarlas es contar el espacio para escribir. */
const rules = (html: string): number => (html.match(/class="rule"/g) ?? []).length;

describe('el espacio de respuesta sale de lo que la tarea pide', () => {
  /**
   * **El caso que protege todo lo que ya existe.** Un documento sin `data-response` es
   * todo el material que ya está en el vault de alguien, y tiene que salir exactamente
   * igual que antes de esta feature — no «parecido».
   */
  it('sin data-response y sin data-answer-space, no emite nada', () => {
    const html = render(block(''));
    expect(html).not.toContain('answer-space');
    expect(rules(html)).toBe(0);
  });

  it('con data-answer-space y sin vía, sigue dando las dos rayas de siempre', () => {
    const html = render(block('data-answer-space="1"'));
    expect(html).toContain('answer-space');
    expect(rules(html)).toBe(2);
  });

  it('una respuesta corta ocupa menos que una larga', () => {
    expect(rules(render(block('data-response="short"'))))
      .toBeLessThan(rules(render(block('data-response="long"'))));
  });

  it('una respuesta corta ya emite espacio, que antes no salía en una hoja adaptada', () => {
    expect(rules(render(block('data-response="short"')))).toBeGreaterThan(0);
  });

  /**
   * El anti-patrón que la receta nombra, y el motivo con el que lo nombra:
   *
   * > «With no mark that an answer belongs there, a corrected sheet cannot say whether the
   * > learner responded — and **in an exam that is a question left unassessed**.»
   *
   * Así que quien contesta hablando no recibe *nada*: recibe la frase y **una marca**. Es
   * lo que dibuja el ejemplo de la receta — la pregunta intacta, «Contesta en voz alta», y
   * debajo una casilla.
   */
  it('quien contesta hablando no recibe rayas, pero sí una marca y la frase', () => {
    const html = render(block('data-response="oral"'));
    expect(rules(html), 'rayas que no va a usar').toBe(0);
    expect(html, 'sin marca, una hoja corregida no puede decir si contestó')
      .toContain('answer-mark');
    expect(html.toLowerCase()).toContain('voz alta');
  });

  it('lo que se dibuja o se manipula recibe un recuadro, no rayas', () => {
    for (const v of ['draw', 'manipulative']) {
      const html = render(block(`data-response="${v}"`));
      expect(rules(html), v).toBe(0);
      expect(html, v).toContain('answer-box');
    }
  });

  /**
   * Elegir y emparejar no llevan espacio: **la respuesta está en el contenido**. Emitir
   * rayas debajo de una lista de opciones es «llenar la página de líneas por si acaso»,
   * que es el primer anti-patrón de la receta y la barrera que el eje señala.
   */
  it('elegir y emparejar no llevan espacio, porque la respuesta está en el contenido', () => {
    for (const v of ['choice', 'match', 'fill']) {
      expect(rules(render(block(`data-response="${v}"`))), v).toBe(0);
      expect(render(block(`data-response="${v}"`)), v).not.toContain('answer-box');
    }
  });

  it('un valor que no conoce se comporta como si no estuviera, nunca rompe la hoja', () => {
    const html = render(block('data-response="telepatia"'));
    expect(html).not.toContain('answer-space');
    expect(rules(html)).toBe(0);
  });

  /**
   * `data-answer-space` no desaparece: sigue significando «este bloque lleva espacio». Lo
   * que cambia es que deja de ser el único que decide **cuánto**.
   */
  it('cuando están los dos, manda la vía, que es la que sabe de qué clase es', () => {
    const html = render(block('data-answer-space="1" data-response="oral"'));
    expect(rules(html)).toBe(0);
    expect(html).toContain('answer-mark');
  });
});

describe('y llega también al documento editable (Principio IV)', () => {
  /**
   * No es simetría por simetría. El Principio IV existe porque una adaptación que vive en
   * una sola salida es una tubería paralela, y **éste es el fichero que ella abre para
   * cambiar dos palabras antes de imprimir**. Si la hoja impresa le quita a un chico las
   * rayas que no puede usar y el editable se las devuelve, la adaptación que recibe
   * depende de por qué botón pasó ella.
   */
  /**
   * **Se mira el uso del estilo, no su nombre**, y es la tercera vez en esta sesión que
   * la misma trampa muerde: el documento lleva **la definición** de todos sus estilos
   * siempre, los use o no, igual que la hoja lleva su CSS y su fuente incrustada. Un
   * `not.toContain('RespuestaLinea')` da falso pase a pase.
   *
   * `text:style-name="X"` sólo aparece donde un párrafo lo usa; `style:name="X"` es la
   * declaración. La diferencia es lo que hace que esto compruebe algo.
   */
  const usa = (x: string, estilo: string): boolean =>
    x.includes(`text:style-name="${estilo}"`);

  const odt = (attrs: string): string => {
    const bytes = renderODT(parseIR(
      `---\ndraft: false\nsigned_off: true\n---\n\n::: {#e1 .exercise ${attrs}}\n`
      + '¿Por qué las plantas necesitan luz?\n:::\n'));
    return Buffer.from(bytes).toString('latin1');
  };

  it('quien contesta hablando no recibe rayas tampoco aquí', () => {
    const x = odt('data-response="oral"');
    expect(usa(x, 'RespuestaLinea')).toBe(false);
    expect(usa(x, 'RespuestaLineaLarga')).toBe(false);
    expect(x).toContain('Contestado');
  });

  it('una respuesta larga recibe más sitio que una corta', () => {
    expect(usa(odt('data-response="long"'), 'RespuestaLineaLarga')).toBe(true);
    expect(usa(odt('data-response="short"'), 'RespuestaLinea')).toBe(true);
  });

  it('lo que se dibuja recibe un recuadro', () => {
    expect(usa(odt('data-response="draw"'), 'RespuestaRecuadro')).toBe(true);
  });

  it('elegir no lleva espacio, igual que en la hoja', () => {
    expect(usa(odt('data-response="choice"'), 'RespuestaEtiqueta')).toBe(false);
  });

  it('sin vía declarada, el editable sale como salía', () => {
    expect(usa(odt('data-answer-space="1"'), 'RespuestaLinea')).toBe(true);
    expect(usa(odt(''), 'RespuestaEtiqueta')).toBe(false);
  });
});
