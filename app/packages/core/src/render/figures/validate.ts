/**
 * The markup allowlist (022 T004, FR-2008/2009/2010,
 * `specs/022-material-que-se-ve/contracts/figures.md`).
 *
 * ## Why this one file is not corpus
 *
 * Every other judgement in `022` lives in `instructions/figures.md`, because a PT should
 * be able to correct which figure teaches which operation. **This is not a judgement, it
 * is a wall** — and a security boundary a teacher can edit is not a boundary (Principle
 * IX). It is code, it is in the deterministic core, and the isolation suite walks it.
 *
 * ## Refuses, never rewrites
 *
 * There is no «cleaned» return type, on purpose. Rewriting attacker-shaped input into
 * something plausible hides the event worth seeing — the same rule `resolveInVault` takes
 * for paths (`007` FR-508), applied to markup. A refused diagram is reported and the
 * sheet renders without it (FR-2011): a refusal that lost the whole page would punish her
 * for something the model did.
 *
 * ## An allowlist, and then the values
 *
 * An allowed element with a hostile value is still a refusal. `<rect fill="url(#x)">` is
 * every attribute on the list and a reference to something else; `<text>` with an entity
 * is text that is not text. So the element list, the attribute list and the **value
 * rules** are three gates, not one.
 */

export type GlyphVerdict =
  | { ok: true }
  /** Quoted and located, in her language. Never paraphrased (Principle IX). */
  | { ok: false; offending: string; message: string };

/** Exactly these, lowercase. A glyph is a shape, not a scene. */
const ELEMENTS: ReadonlySet<string> = new Set([
  'g', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path', 'text',
]);

const ATTRIBUTES: ReadonlySet<string> = new Set([
  // Geometry
  'x', 'y', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2',
  'width', 'height', 'points', 'd',
  // Paint
  'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-dasharray', 'opacity',
  // Text
  'font-size', 'text-anchor', 'dominant-baseline',
  // Transform
  'transform',
]);

/** The fragment's own bounds. A shape, not a scene. */
export const GLYPH_BOUNDS = { maxElements: 20, maxBytes: 2000, maxDepth: 3 } as const;

/**
 * Anything in a value that means «go and get something».
 *
 * `url(` refuses even a local reference: a paint server is a reference, and «no
 * references at all» is a one-line assertion where «no *remote* references» is a
 * judgement call somebody has to keep making. `//` catches a protocol-relative URL,
 * which is the one people forget.
 */
const FORBIDDEN_IN_VALUE: ReadonlyArray<[RegExp, string]> = [
  [/url\s*\(/i, 'url('],
  [/javascript\s*:/i, 'javascript:'],
  [/data\s*:/i, 'data:'],
  [/https?\s*:/i, 'http:'],
  [/\/\//, '//'],
  [/[<&]/, '< o &'],
];

const NAMED_COLOURS: ReadonlySet<string> = new Set([
  'none', 'currentcolor', 'transparent',
  'black', 'white', 'grey', 'gray', 'silver', 'red', 'green', 'blue', 'yellow',
  'orange', 'purple', 'brown', 'pink', 'navy', 'teal', 'olive', 'maroon', 'lime',
  'aqua', 'fuchsia', 'beige', 'ivory', 'khaki', 'coral', 'salmon', 'tan', 'gold',
]);

const refuse = (offending: string, why: string): GlyphVerdict =>
  ({ ok: false, offending, message: why });

export function validateGlyph(fragment: string): GlyphVerdict {
  const raw = fragment.trim();
  if (raw === '') return { ok: true };  // no glyph is not a bad glyph

  if (byteLength(raw) > GLYPH_BOUNDS.maxBytes) {
    return refuse(`${byteLength(raw)} bytes`,
      `El dibujo que propone pasa de ${GLYPH_BOUNDS.maxBytes} caracteres. `
      + 'Un glifo es una forma, no una escena.');
  }

  /*
   * The things that are refused by **shape** rather than by name, first.
   *
   * A comment, a processing instruction or a CDATA section is not an element with a bad
   * name — the tag walker below would not see it as one at all — so it has to be caught
   * before the walk rather than by it.
   */
  for (const [pattern, what] of [
    [/<!--/, 'un comentario'], [/<!\[CDATA\[/i, 'CDATA'], [/<\?/, 'una instrucción'],
    [/<!/, 'una declaración'], [/&[#a-zA-Z]/, 'una entidad'],
  ] as ReadonlyArray<[RegExp, string]>) {
    if (pattern.test(raw)) {
      return refuse(what, `El dibujo que propone lleva ${what}, y eso no lo acepto. `
        + 'No lo he limpiado: lo he rechazado entero.');
    }
  }

  let depth = 0;
  let elements = 0;
  const TAG = /<\s*(\/?)\s*([A-Za-z_:][-\w:.]*)((?:[^<>"']|"[^"]*"|'[^']*')*?)(\/?)\s*>/g;
  let consumed = 0;
  let m: RegExpExecArray | null;

  while ((m = TAG.exec(raw)) !== null) {
    const [whole, closing, nameRaw, attrs, selfClosing] = m;
    const name = nameRaw!.toLowerCase();

    /*
     * Text between tags: plain, and nothing else.
     *
     * Checked here rather than after the walk so the **location** is known — the offending
     * text can be quoted as she will see it. The forbidden-value patterns are reused
     * because the same things are wrong in a value and in text content.
     */
    const between = raw.slice(consumed, m.index);
    const badText = FORBIDDEN_IN_VALUE.find(([p]) => p.test(between));
    if (badText) {
      return refuse(badText[1], `El texto del dibujo lleva «${badText[1]}». Rechazado.`);
    }
    consumed = m.index + whole!.length;

    if (!ELEMENTS.has(name)) {
      return refuse(`<${nameRaw}>`,
        `El dibujo que propone usa «${nameRaw}», que no está en lo que acepto. `
        + 'No lo he limpiado: lo he rechazado entero.');
    }

    if (closing === '/') {
      depth -= 1;
      if (depth < 0) return refuse(`</${nameRaw}>`, 'El dibujo que propone está mal cerrado.');
      continue;
    }

    elements += 1;
    if (elements > GLYPH_BOUNDS.maxElements) {
      return refuse(`${elements} elementos`,
        `El dibujo que propone tiene más de ${GLYPH_BOUNDS.maxElements} formas. `
        + 'Un glifo es una forma, no una escena.');
    }

    const bad = checkAttributes(attrs ?? '');
    if (bad) return bad;

    if (selfClosing !== '/') {
      depth += 1;
      if (depth > GLYPH_BOUNDS.maxDepth) {
        return refuse(`<${nameRaw}>`,
          `El dibujo que propone anida más de ${GLYPH_BOUNDS.maxDepth} niveles.`);
      }
    }
  }

  const tail = FORBIDDEN_IN_VALUE.find(([p]) => p.test(raw.slice(consumed)));
  if (tail) return refuse(tail[1], `El texto del dibujo lleva «${tail[1]}». Rechazado.`);

  if (depth !== 0) return refuse('sin cerrar', 'El dibujo que propone está mal cerrado.');
  if (elements === 0) {
    return refuse('nada', 'Lo que propone como dibujo no tiene ninguna forma dentro.');
  }
  return { ok: true };
}

function checkAttributes(attrs: string): GlyphVerdict | null {
  const ATTR = /([A-Za-z_:][-\w:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  /*
   * A bare attribute is refused before the loop, because `ATTR` cannot see one.
   *
   * `<rect hidden>` and, more to the point, `<rect onload>` parse as no attribute at all
   * to a name=value scanner — so a walker that only looks at pairs is a walker with a
   * hole exactly where the `on*` handlers are.
   */
  const bare = attrs.replace(ATTR, ' ').match(/[A-Za-z_:][-\w:.]*/);
  if (bare) {
    return refuse(bare[0],
      `El dibujo que propone lleva «${bare[0]}» sin valor, y eso no lo acepto.`);
  }

  while ((m = ATTR.exec(attrs)) !== null) {
    const name = m[1]!.toLowerCase();
    const value = (m[3] ?? m[4] ?? '');

    if (!ATTRIBUTES.has(name)) {
      return refuse(name,
        `El dibujo que propone usa el atributo «${name}», que no está en lo que acepto. `
        + 'No lo he limpiado: lo he rechazado entero.');
    }

    const forbidden = FORBIDDEN_IN_VALUE.find(([p]) => p.test(value));
    if (forbidden) {
      return refuse(forbidden[1],
        `El valor de «${name}» lleva «${forbidden[1]}», que apunta a algo de fuera o `
        + 'a algo que se ejecuta. Rechazado.');
    }

    const bad = checkValue(name, value);
    if (bad) return bad;
  }
  return null;
}

function checkValue(name: string, value: string): GlyphVerdict | null {
  const v = value.trim();

  if (name === 'fill' || name === 'stroke') {
    const ok = /^#[0-9a-fA-F]{3}$/.test(v) || /^#[0-9a-fA-F]{6}$/.test(v)
      || NAMED_COLOURS.has(v.toLowerCase());
    return ok ? null : refuse(v,
      `«${v}» no es un color que acepte en «${name}»: sólo #rgb, #rrggbb o un nombre.`);
  }

  if (name === 'd') {
    return /^[MmLlHhVvCcSsQqTtAaZz0-9\s,.eE+-]*$/.test(v) ? null
      : refuse(v, 'El trazado del dibujo lleva algo que no es un trazado.');
  }

  if (name === 'points') {
    return /^[0-9\s,.eE+-]*$/.test(v) ? null
      : refuse(v, 'Los puntos del dibujo llevan algo que no es un número.');
  }

  if (name === 'transform') {
    /*
     * Three functions, numeric arguments, and nothing else.
     *
     * `transform` is the one allowed attribute whose value is a *little language*, so it
     * gets its own grammar rather than a substring check.
     */
    const ok = /^(\s*(translate|scale|rotate)\s*\(\s*-?[\d.]+(\s*[, ]\s*-?[\d.]+){0,2}\s*\)\s*)+$/
      .test(v);
    return ok ? null : refuse(v,
      'Sólo acepto translate, scale y rotate con números en «transform».');
  }

  // Everything else is a number, a length or a keyword — no scheme, no reference.
  return /^[-\w\s.,%]*$/.test(v) ? null
    : refuse(v, `El valor de «${name}» lleva caracteres que no acepto.`);
}

const byteLength = (s: string): number => new TextEncoder().encode(s).length;
