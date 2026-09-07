import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parseIR } from '../src/ir/parse.js';
import { renderHTML } from '../src/render/html.js';

/**
 * La estructura de la hoja que recibe el niño (037).
 *
 * ## Por qué esto no existía
 *
 * `render/html.ts` declara «Accessibility target: WCAG 2.2 level AA» en un comentario y
 * **nada lo comprobaba**. `contrast.test.ts` cubre la paleta de la *aplicación*, y la
 * barrida de `a11y.spec.ts` excluía el contenido del visor diciendo que su accesibilidad
 * «is checked where those renderers are» — y no se comprobaba en ningún sitio.
 *
 * ## Y por qué esta capa no la sustituye axe
 *
 * Medido el 2026-09-07: a nivel WCAG A/AA la hoja salía **limpia, cero violaciones**, con
 * **cero cabeceras** dentro. Un comprobador de conformidad no puede saber que el original
 * tenía estructura que el render tiró: lo que sale es HTML válido que dice otra cosa.
 *
 * Así que hay dos capas y ninguna cubre a la otra. Ésta es la determinista, y `037` T009
 * lo demuestra con una mutación que falla aquí y no allí.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');

/** Una ficha real, fotografiada torcida, con una cabecera de verdad en su IR. */
const fixture = () => parseIR(readFileSync(
  join(repoRoot, 'cases', '003-ingest-fixtures', '01-ecosistemas-torcida', 'ground-truth.md'),
  'utf8'));

const headings = (html: string) => [...html.matchAll(/<h([1-6])\b[^>]*>(.*?)<\/h\1>/gs)]
  .map((m) => ({ level: Number(m[1]), text: m[2]!.replace(/<[^>]+>/g, '').trim() }));

describe('una cabecera del original es una cabecera en la hoja (FR-3501…FR-3505)', () => {
  /**
   * La reparación, y el decimosexto caso del defecto insignia de este repositorio con
   * lector por fin — el primero en el producto que llega al niño.
   *
   * No es cosmética. Para un alumno con barrera de función ejecutiva las cabeceras son
   * cómo una página se vuelve recorrible, y `recipes/core/signpost-the-page.md` es una
   * receta **core** que dispara con `EJE>=2` y promete exactamente eso: el corpus
   * prometía señalizar y el renderizador lo tiraba. Para quien usa lector de pantalla son
   * el medio principal de moverse por un documento.
   */
  it('la pinta como elemento de cabecera y no como párrafo', () => {
    const html = renderHTML(fixture());
    expect(headings(html).map((h) => h.text)).toContain('Los ecosistemas');
    expect(html, 'sigue saliendo como párrafo').not.toContain('<p>Los ecosistemas</p>');
  });

  /**
   * **Dentro de su `<section>`, con todos sus `data-*`** (Principio VI).
   *
   * Éste es el hallazgo del re-check del plan. La reparación obvia es «emite `<h2>` en vez
   * de `<section>`», y eso tiraría el id, las clases y el juego entero de `data-*` — la
   * receta y el eje que justifican cada cambio. «Un cambio que no puede decir qué receta y
   * qué eje lo justifican NO DEBE hacerse» se convertiría en «un cambio que lo decía y
   * dejó de decirlo».
   */
  it('conserva la sección y toda su procedencia', () => {
    const html = renderHTML(fixture());
    const section = /<section id="p1-b1"[^>]*>/.exec(html)?.[0] ?? '';
    expect(section, 'la sección desapareció').not.toBe('');
    expect(section).toContain('data-heading="true"');
    expect(section).toContain('data-page="1"');
    expect(section).toContain('data-source-id="b1"');
    // Y la clase del bloque sigue siendo la suya: una cabecera es una **propiedad** de un
    // bloque que ya tiene clase, no una quinta clase de bloque.
    expect(section).toContain('class="explanation"');
  });

  /**
   * **Todas al mismo nivel** (FR-3502), y es una decisión y no un descuido.
   *
   * El IR marca «esto es una cabecera» y **no lleva nivel**. Deducir jerarquía del orden
   * —la primera es el título, las demás van dentro— afirmaría que «Parte 2» está contenida
   * en «Parte 1», que el original no dijo. Adaptar el *cómo* no incluye inventarse una
   * estructura que el *qué* nunca tuvo (Principio III).
   */
  it('pone todas las cabeceras al mismo nivel, sin jerarquía inventada', () => {
    const doc = parseIR(
      '---\nsource: "photos"\n---\n\n'
      + '::: {#a .explanation data-heading="true"}\nParte 1\n:::\n\n'
      + '::: {#b .explanation}\nTexto\n:::\n\n'
      + '::: {#c .explanation data-heading="true"}\nParte 2\n:::\n');
    const hs = headings(renderHTML(doc));
    expect(hs.map((h) => h.text)).toEqual(['Parte 1', 'Parte 2']);
    expect(new Set(hs.map((h) => h.level)).size, 'niveles distintos = jerarquía inventada')
      .toBe(1);
  });

  /** Y sin saltos, que es lo mismo dicho desde el otro lado (FR-3502, SC-3501). */
  it('no salta niveles, y cuenta las mismas cabeceras que marcó el original', () => {
    const doc = fixture();
    const marked = doc.blocks.filter((b) => b.attrs['data-heading'] === 'true').length;
    const hs = headings(renderHTML(doc));
    expect(hs).toHaveLength(marked);
    const levels = hs.map((h) => h.level);
    for (const [a, b] of levels.slice(0, -1).map((x, i) => [x, levels[i + 1]!] as const)) {
      expect(b - a, `salto de ${a} a ${b}`).toBeLessThanOrEqual(1);
    }
  });

  /**
   * **Nada se inventa** (FR-3503, SC-3505).
   *
   * Un documento cuyo original era un muro de texto plano se renderiza como uno. Ésta es
   * la tentación con nombre: un comprobador de buenas prácticas pide una cabecera de nivel
   * uno, y la hoja no tiene título que poner ahí — el `<title>` es la constante «Material
   * adaptado» y nadie pasa uno de verdad. Inventárselo sería falsificar el *qué*. La
   * pregunta de contenido que hay detrás está en BACKLOG G59.
   */
  it('no inventa ninguna cabecera donde el original no tenía', () => {
    const doc = parseIR('---\nsource: "pegado"\n---\n\n'
      + '::: {#a .explanation}\nUn muro de texto sin cabeceras.\n:::\n');
    const html = renderHTML(doc);
    expect(headings(html)).toEqual([]);
    expect(html, 'un <h1> inventado es falsificar el qué').not.toMatch(/<h1\b/);
  });

  /**
   * El texto de una cabecera es **texto** (FR-3505, Principio IX).
   *
   * Viene de un documento, y un documento nunca es una instrucción — ni un enlace, ni un
   * estilo. Una cabecera no puede ser una segunda superficie de parseo donde un
   * `[enlace](…)` del original se convierta en estructura.
   */
  it('no convierte el texto de una cabecera en enlace ni en estructura', () => {
    const doc = parseIR('---\nsource: "pegado"\n---\n\n'
      + '::: {#a .explanation data-heading="true"}\n'
      + '# Extra [enlace](http://x) **fuerte**\n:::\n');
    const html = renderHTML(doc);
    const hs = headings(html);
    expect(hs, 'debe haber exactamente una cabecera, la del bloque').toHaveLength(1);
    expect(html).not.toContain('<a href');
  });
});

/*
 * ## La línea base estuvo aquí, y su desaparición es el registro del cambio
 *
 * T001 escribió una instantánea del comportamiento equivocado —el bloque marcado como
 * cabecera en el IR saliendo como `<p>`, y la hoja con **cero** cabeceras— mientras el
 * defecto estaba puesto. El patrón es el de `020` T001 y `031`: en este repositorio no se
 * puede committear en rojo, así que la forma de dejar constancia de qué se rompía es
 * afirmarlo verde primero y verlo caer cuando se arregla.
 *
 * Cayó. Los cuatro casos de arriba pasaron a verde y éste a rojo en el mismo commit, que
 * es la prueba de que el diff de `renderBlock` es el cambio entero y no una parte.
 *
 * Se retira en vez de dejarse invertido: un test que afirma que ya no ocurre lo que no
 * ocurre es ruido, y lo que sí importa —que la reparación se pueda deshacer sin que nadie
 * se entere— es `037` T009, la mutación.
 */

describe('las propiedades que ya se cumplen, y tienen que seguir cumpliéndose', () => {
  /*
   * Verdes hoy (T002). No son una afirmación sobre esta funcionalidad: son la red para un
   * cambio al renderizador, y están enumeradas con su motivo porque una lista que nadie
   * eligió es una lista que se silencia la primera vez que estorba (research R5).
   */
  const html = () => renderHTML(fixture());

  it('declara el idioma del documento, del que un lector de pantalla saca su voz', () => {
    expect(html()).toMatch(/<html[^>]+lang="es"/);
  });

  it('tiene un <main>, para que se pueda saltar a lo que importa', () => {
    expect(html()).toContain('<main>');
  });

  it('describe toda imagen: una foto que nadie describió no la tiene quien más la necesita', () => {
    const imgs = [...html().matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
    for (const img of imgs) expect(img, img).toMatch(/\balt="/);
  });

  it('pone cabeceras de columna en cualquier tabla, o no hay tabla', () => {
    const out = html();
    if (!out.includes('<table')) return;
    expect(out).toContain('<th');
  });

  it('no reordena la página contra su propio orden de lectura', () => {
    expect(html()).not.toMatch(/tabindex="[1-9]/);
  });

  it('no lleva ningún manejador en línea: una hoja es un documento, no una instrucción', () => {
    expect(html()).not.toMatch(/\son(click|load|error|mouseover|focus)=/i);
  });

  it('embebe las imágenes y no enlaza nada remoto', () => {
    const out = html();
    for (const m of out.matchAll(/<img\b[^>]*\bsrc="([^"]*)"/g)) {
      expect(m[1], 'una hoja enviada por correo tiene que seguir mostrando sus dibujos')
        .toMatch(/^data:/);
    }
  });
});
