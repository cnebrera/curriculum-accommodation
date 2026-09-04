import { describe, it, expect } from 'vitest';
import { validateGlyph, GLYPH_BOUNDS } from '../src/index.js';

/**
 * The markup allowlist refuses, and never cleans (022 T001, FR-2008/2009/2010).
 *
 * Written first, per the tasks' own sequencing, and it is the file the rest of this
 * feature is allowed to exist behind: everything else in `022` puts model-written markup
 * into a document a child holds.
 *
 * ## Why every case asserts a refusal rather than a sanitised output
 *
 * Because there is no sanitised output type, on purpose. Rewriting attacker-shaped input
 * into something plausible hides the event worth seeing — `007` FR-508's rule for paths,
 * applied to markup. So the assertion is always «refused, and the offending token
 * quoted», and never «the script tag is gone».
 */
const HOSTILE: ReadonlyArray<[string, string, string]> = [
  ['a script', '<script>alert(1)</script>', 'script'],
  ['a script inside an allowed element', '<g><script>x()</script></g>', 'script'],
  ['an event handler', '<rect width="4" height="4" onload="x()"/>', 'onload'],
  ['a bare event handler with no value', '<rect width="4" onload/>', 'onload'],
  ['an href', '<a href="http://x.test"><rect width="4"/></a>', 'a'],
  ['an xlink:href', '<use xlink:href="#x"/>', 'use'],
  ['an image', '<image width="4" height="4"/>', 'image'],
  ['a use', '<use x="1"/>', 'use'],
  ['a url() paint server', '<rect width="4" height="4" fill="url(#g)"/>', 'url('],
  ['a data: scheme', '<rect width="4" fill="data:image/png;base64,AA"/>', 'data:'],
  ['a style element', '<style>*{fill:red}</style>', 'style'],
  ['a style attribute', '<rect width="4" style="fill:red"/>', 'style'],
  ['a foreignObject', '<foreignObject width="4"><div/></foreignObject>', 'foreignObject'],
  ['an animate', '<rect width="4"><animate attributeName="x"/></rect>', 'animate'],
  ['a filter', '<filter id="f"/>', 'filter'],
  ['a clipPath', '<clipPath id="c"><rect width="4"/></clipPath>', 'clipPath'],
  ['a pattern', '<pattern id="p"><rect width="4"/></pattern>', 'pattern'],
  ['a defs', '<defs><rect width="4"/></defs>', 'defs'],
  ['a marker', '<marker id="m"/>', 'marker'],
  ['a symbol', '<symbol id="s"/>', 'symbol'],
  ['a switch', '<switch><rect width="4"/></switch>', 'switch'],
  ['metadata', '<metadata>x</metadata>', 'metadata'],
  ['an entity', '<text>&lt;b&gt;</text>', 'entidad'],
  ['a comment', '<rect width="4"/><!-- x -->', 'comentario'],
  ['CDATA', '<text><![CDATA[x]]></text>', 'CDATA'],
  ['a processing instruction', '<?xml version="1.0"?><rect width="4"/>', 'instrucción'],
  ['a doctype', '<!DOCTYPE svg><rect width="4"/>', 'declaración'],
  ['an xmlns declaration on a child', '<rect width="4" xmlns:x="http://x.test"/>', 'xmlns:x'],
  ['a protocol-relative reference', '<rect width="4" fill="//x.test/a.png"/>', '//'],
  ['a nested svg', '<svg><rect width="4"/></svg>', 'svg'],
];

describe('what is refused, whole and quoted', () => {
  for (const [what, fragment, token] of HOSTILE) {
    it(`refuses ${what}`, () => {
      const v = validateGlyph(fragment);
      expect(v.ok, `«${fragment}» was accepted`).toBe(false);
      if (v.ok) return;
      // Quoted, so the report can show her what was in her material rather than
      // describing it (Principle IX).
      expect(`${v.offending} ${v.message}`, what).toContain(token);
    });
  }

  /**
   * The claim that makes the rest of this file mean something.
   *
   * A validator that returned a cleaned fragment would pass every case above and still
   * put attacker-shaped markup — minus the parts it recognised — into a child's sheet.
   * There is no such field, and this asserts the type has not grown one.
   */
  it('returns no cleaned version of anything, ever', () => {
    const v = validateGlyph('<script>x()</script><rect width="4" height="4"/>');
    expect(Object.keys(v).sort()).toEqual(['message', 'offending', 'ok']);
  });
});

/**
 * The attribute allowlist, on its own.
 *
 * Found by mutation: turning the attribute list off left the whole file green, because
 * every bad-attribute case above happens to be caught by a **value** rule as well —
 * `onload="x()"` has a parenthesis, `style="fill:red"` has a colon, `xmlns:x` has an
 * `http`. That is luck, not design. These two cases have innocuous values, so the only
 * thing standing between them and the page is the list of names.
 */
describe('the attribute list, provably', () => {
  it('refuses an event handler whose value looks harmless', () => {
    const v = validateGlyph('<rect width="4" height="4" onload="init"/>');
    expect(v.ok).toBe(false);
    expect(!v.ok && v.offending).toBe('onload');
  });

  it('refuses an attribute nobody declared, however inert', () => {
    // `data-x="1"` can do nothing at all. It is refused because an allowlist that lets
    // through what it does not recognise is not one.
    expect(validateGlyph('<rect width="4" height="4" data-x="1"/>').ok).toBe(false);
    expect(validateGlyph('<rect width="4" height="4" id="a"/>').ok).toBe(false);
    expect(validateGlyph('<rect width="4" height="4" class="a"/>').ok).toBe(false);
  });
});

/**
 * And `url(` in text, which is the one place it can actually reach.
 *
 * Also found by mutation: removing `url(` from the forbidden-value list changed nothing,
 * because no allowed attribute's value grammar admits a parenthesis — the ban is defence
 * in depth and was **unreachable through any attribute**. Where it is reachable is text
 * content, which is checked with the same list.
 *
 * Worth keeping rather than deleting as dead: `transform`'s grammar is the one value
 * rule that does admit parentheses, and a future kind that needs another function there
 * would make the attribute path reachable again.
 */
describe('a reference in text content', () => {
  it('refuses url( where it can actually appear', () => {
    const v = validateGlyph('<text>url(#g)</text>');
    expect(v.ok).toBe(false);
    expect(!v.ok && v.offending).toBe('url(');
  });
});

describe('an allowed element with a hostile value is still a refusal', () => {
  it('a colour that is not a colour', () => {
    const v = validateGlyph('<rect width="4" height="4" fill="expression(alert(1))"/>');
    expect(v.ok).toBe(false);
  });

  it('a path that is not a path', () => {
    const v = validateGlyph('<path d="M0 0 L4 4 </script>"/>');
    expect(v.ok).toBe(false);
  });

  it('points that are not numbers', () => {
    expect(validateGlyph('<polyline points="0,0 javascript:x"/>').ok).toBe(false);
  });

  it('a transform that is a function we do not accept', () => {
    expect(validateGlyph('<g transform="matrix(1,0,0,1,0,0)"><rect width="4"/></g>').ok)
      .toBe(false);
    // …and one we do, with a hostile argument.
    expect(validateGlyph('<g transform="translate(url(#x))"><rect width="4"/></g>').ok)
      .toBe(false);
  });

  it('text content that carries a scheme', () => {
    expect(validateGlyph('<text>http://x.test</text>').ok).toBe(false);
  });
});

describe('the fragment’s own bounds', () => {
  it('refuses more shapes than a glyph has', () => {
    const many = '<rect width="4" height="4"/>'.repeat(GLYPH_BOUNDS.maxElements + 1);
    const v = validateGlyph(many);
    expect(v.ok).toBe(false);
    expect(!v.ok && v.message).toContain(String(GLYPH_BOUNDS.maxElements));
  });

  it('refuses a fragment longer than a shape needs', () => {
    const v = validateGlyph(`<path d="${'1 '.repeat(GLYPH_BOUNDS.maxBytes)}"/>`);
    expect(v.ok).toBe(false);
    expect(!v.ok && v.message).toContain(String(GLYPH_BOUNDS.maxBytes));
  });

  it('refuses nesting deeper than a shape needs', () => {
    expect(validateGlyph('<g><g><g><g><rect width="4"/></g></g></g></g>').ok).toBe(false);
  });

  it('refuses a fragment with no shape in it at all', () => {
    expect(validateGlyph('<g></g>').ok).toBe(true);   // a group is a shape-holder
    expect(validateGlyph('   x   ').ok).toBe(false);  // text pretending to be markup
  });
});

describe('what is accepted, so the refusals above are not just «everything»', () => {
  const GOOD = [
    '<rect width="10" height="14" rx="2" fill="#fff" stroke="#333"/>',
    '<circle cx="6" cy="6" r="5" fill="none" stroke="black" stroke-width="1.5"/>',
    '<g transform="translate(2, 3)"><rect width="8" height="8" fill="white"/></g>',
    '<path d="M0 0 L10 0 L5 8 Z" fill="none" stroke="#222"/>',
    '<polyline points="0,0 4,4 8,0" fill="none" stroke="grey"/>',
    '<text x="4" y="9" font-size="6" text-anchor="middle">3</text>',
    '<ellipse cx="5" cy="5" rx="4" ry="2" fill="#eee" stroke="#000" opacity="0.9"/>',
    '<line x1="0" y1="0" x2="10" y2="0" stroke="black" stroke-dasharray="2 2"/>',
  ];

  for (const fragment of GOOD) {
    it(`accepts ${fragment.slice(0, 28)}…`, () => {
      const v = validateGlyph(fragment);
      expect(v.ok, !v.ok ? `${v.offending}: ${v.message}` : '').toBe(true);
    });
  }

  it('and an absent glyph, which is a plain figure and not a bad one', () => {
    expect(validateGlyph('').ok).toBe(true);
    expect(validateGlyph('   ').ok).toBe(true);
  });
});
