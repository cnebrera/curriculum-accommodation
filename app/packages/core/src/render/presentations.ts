import type { Axis } from '../vault/schema.js';

/**
 * The presentations a sheet can take, enumerated as **inputs** (`038` FR-3603).
 *
 * ## Why this lists axis levels and never presentation values
 *
 * `presentationFor` is the single place that turns barriers into typography. Anything
 * that wants to *show* what a sheet can look like needs the list of presentations it can
 * produce, and the obvious way to get one is to write the values out.
 *
 * That has already been done once, and it had already rotted before anybody noticed.
 * `e2e/sheet-a11y.spec.ts` held three literals, and its largest was
 * `{ fontSize: '24pt', lineHeight: '2', measure: '44ch' }` — values that are reachable,
 * so it read as correct. What a learner with `PER-V:2` and `DEC:1` actually receives is
 * four properties more: `ink: '#000'`, `paper: '#fff'`, and the letter and word spacing
 * that are the entire point of `DEC`. The accessibility sweep therefore ran over a sheet
 * **less adapted than any real learner's**, at `#111` on white instead of the `#000`
 * that axis produces.
 *
 * Nothing was wrong with the value. It was **stale**, and plausible enough that nobody
 * reread it — which is ADR 0009's argument about baselines arriving in a place nobody
 * had thought of as a baseline.
 *
 * So there is deliberately **no field here able to hold a `Presentation`**. The values
 * come from `presentationFor(levels)` at the call site, every time, and
 * `presentations.test.ts` asserts over this file's own source that no knob name appears
 * in it. The guarantee is what the type does not have.
 *
 * ## What `040` does with it
 *
 * An appearance band is another kind of input. When bands exist they compose with these
 * levels through the same call, so band × axis presentations are produced rather than
 * written out — which is what `038` FR-3615 asks for, satisfied by this shape rather
 * than by any band existing yet.
 */
export interface SheetPresentation {
  /**
   * Stable, filename-safe, and part of the record's interface: it appears in committed
   * filenames and gets quoted in review. Renaming one renames files in git.
   *
   * No digits, deliberately — a filename segment carrying numbers can read as a learner
   * code, and these files are committed.
   */
  id: string;
  /**
   * The rule in `presentationFor` this member represents, in prose, for whoever is
   * reading a directory listing rather than this file.
   */
  because: string;
  /** The axis levels that produce it. **The** input — never the resulting values. */
  levels: Partial<Record<Axis, 0 | 1 | 2 | 3>>;
}

/**
 * One member per rule in `presentationFor`, plus the baseline. Six, and the set is small
 * because only four of the ten axes touch presentation at all.
 *
 * `ATE: 2` is absent on purpose: it sets the same page break as `COG: 2` and nothing
 * else, so a seventh member would be a picture identical to the fifth. That equality is
 * asserted in the test rather than merely assumed here, so a contributor who adds it
 * later reads waste rather than coverage.
 */
export const SHEET_PRESENTATIONS: readonly SheetPresentation[] = [
  {
    id: 'sin-barreras',
    because: 'La línea base. Ningún eje observado, todo por defecto — la hoja contra la '
      + 'que se comparan las demás.',
    levels: {},
  },
  {
    id: 've-poco',
    because: 'Ve con dificultad: cuerpo mayor y una línea más corta, para que la vista '
      + 'no tenga que recorrer tanto.',
    levels: { 'PER-V': 1 },
  },
  {
    id: 've-muy-poco',
    because: 'Ve muy poco: el cuerpo más grande que hay, tinta de máximo contraste y la '
      + 'línea más corta. Es la hoja que más se parece a un cartel.',
    levels: { 'PER-V': 2 },
  },
  {
    id: 'descifra-con-esfuerzo',
    because: 'Le cuesta descifrar el texto: doble interlínea y aire entre letras y '
      + 'palabras, que es lo que separa una palabra de la siguiente para quien lee '
      + 'letra a letra.',
    levels: { DEC: 1 },
  },
  {
    id: 'una-tarea-por-pagina',
    because: 'No sostiene varias cosas a la vez: un ejercicio por página, con el papel '
      + 'en blanco alrededor. Es la presentación que hace seis hojas de seis '
      + 'ejercicios, y hay que verla para juzgarla.',
    levels: { COG: 2 },
  },
  {
    id: 'satura',
    because: 'Se satura con el color: el acento baja a un gris azulado. Es el cambio '
      + 'más pequeño de la lista y el más fácil de romper sin darse cuenta.',
    levels: { REG: 2 },
  },
];
