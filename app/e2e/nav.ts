import { expect, type Page } from '@playwright/test';

/**
 * How the suite walks to a screen. **The only place that knows.**
 *
 * Was `e2e/door.ts`, renamed for `020` T008 because the door stops being how you get
 * anywhere. A spec that hand-rolls a walk is a spec that quietly stops testing the
 * navigation the day one of its steps changes, so there is one file and every spec
 * imports it.
 *
 * ## Two shapes live here at once, on purpose
 *
 * `020` US1 **removes nothing**: the caseload becomes the opening screen and a learner
 * becomes a place with a menu, while «Preparar material» stays in the top level until
 * US2 has replaced it. So this file holds both walks, and the door's half is marked
 * with the task that deletes it (T028).
 *
 * What must not happen while both exist: an assertion loosened so that a walk passes.
 * The routes change; what they check does not.
 */

/* ── The learner as a place (020 US1) ─────────────────────────────────────── */

/** The learner's sections, by the names she reads. */
export const TAB = {
  who: 'Quién es',
  prepare: 'Preparar',
  made: 'Lo que le he preparado',
  curriculum: 'Su adaptación curricular',
} as const;

/**
 * The rail, whichever of its two shapes is up.
 *
 * There is one rail and its contents change with where she is (`020` option A), so its
 * accessible name is what tells the two apart — «Secciones de Rampa» outside a learner,
 * «Apartados de <nombre>» inside one. Locating by that name rather than by a class means
 * a spec cannot accidentally assert against the wrong one.
 */
export const rail = (page: Page) => page.getByRole('navigation', { name: 'Secciones de Rampa' });
export const learnerRail = (page: Page) => page.getByRole('navigation', { name: /^Apartados de/ });

/** The caseload is the opening screen (FR-1801), so this is «go home». */
export async function toCaseload(page: Page): Promise<void> {
  // Inside a learner the control is «← Mis alumnos»; outside it is «Mis alumnos». One
  // locator for both, because a helper that needs to know where it already is has
  // stopped being a helper.
  await page.getByRole('button', { name: /^(← )?Mis alumnos$/ }).first().click();
  await page.getByRole('heading', { name: 'Mis alumnos' }).waitFor();
}

/**
 * Into a learner, by position in her caseload.
 *
 * By index rather than by name because a spec that seeded three learners cares about
 * *which*, not about the code — the same reasoning the door's picker used, kept.
 */
export async function intoLearner(page: Page, index = 0): Promise<void> {
  await toCaseload(page);
  await page.locator('.card-action').nth(index).click();
  // The rail turning into the learner's is the arrival — a heading alone could still be
  // the caseload's.
  await learnerRail(page).waitFor();
}

/** A section of the learner she is already inside. */
export async function toTab(page: Page, tab: keyof typeof TAB): Promise<void> {
  await learnerRail(page).getByRole('button', { name: TAB[tab], exact: true }).click();
}

/* ── The door (016) · deleted by 020 T028 ─────────────────────────────────── */

/** The rail control that opens the door. Was «Adaptar material» before `016`. */
export const RAIL_WORK = 'Preparar material';

/**
 * Learner → work → material, and into the adapt screen.
 *
 * `learnerIndex` because the picker shows her the names, and a spec that seeded
 * three learners cares about *which*, not about the code.
 */
export const KIND_WORKSHEET = 'Una ficha o unos ejercicios';
export const KIND_EXAM = 'Un examen o una prueba';

/**
 * Exact names throughout, and the reason is worth recording: the adapt door's own
 * description says «Una ficha, un examen, unos apuntes…», so a substring locator
 * for «Una ficha» matches the door **and** the kind. Playwright's default is
 * substring, which found a real ambiguity rather than being pedantic about one.
 */
export async function throughDoorToAdapt(
  page: Page,
  opts: { learnerIndex?: number; kind?: string } = {},
): Promise<void> {
  await page.getByRole('button', { name: RAIL_WORK }).click();
  await page.getByRole('heading', { name: '¿Qué vas a hacer?' }).waitFor();

  await page.locator('.pick').nth(opts.learnerIndex ?? 0).click();
  await page.locator('.door', { hasText: 'Adaptar algo que tengo' }).click();
  await page.locator('.door', { hasText: opts.kind ?? KIND_WORKSHEET }).click();

  await page.getByRole('button', { name: 'Empezar', exact: true }).click();
  // The adapt screen owns the paste box, so its presence is the arrival.
  await page.locator('#text').waitFor();
}

/** Learner → «hacer material», and into the compose screen. */
export async function throughDoorToCompose(
  page: Page, opts: { learnerIndex?: number; kind?: string } = {},
): Promise<void> {
  await page.getByRole('button', { name: RAIL_WORK }).click();
  await page.getByRole('heading', { name: '¿Qué vas a hacer?' }).waitFor();

  await page.locator('.pick').nth(opts.learnerIndex ?? 0).click();
  await page.locator('.door', { hasText: 'Hacer material para que aprenda' }).click();
  await page.getByRole('button', { name: 'Empezar', exact: true }).click();

  await page.locator('#objetivos').waitFor();
  /*
   * And the first question on that screen: **what kind of material** (`021` FR-1907).
   *
   * Before `021` the kind was derived from whatever came out, so «solo me ha dicho de
   * preparar fichas» was literally true. Now nothing is pre-chosen, so a walk that does
   * not answer it reaches a primary control that is correctly disabled — which is how
   * this helper started failing four specs at once, and why it belongs here rather than
   * in each of them.
   */
  await page.locator('.door', { hasText: opts.kind ?? KIND_WORKSHEET }).click();
}

/**
 * The door refuses to start until all three are answered, and **says which**
 * (FR-1105 · `016` T007).
 *
 * Here rather than in one spec because it is the door's core promise and every
 * spec that walks through it depends on the walk being in that order.
 */
export async function assertDoorAsksInOrder(page: Page): Promise<void> {
  await page.getByRole('button', { name: RAIL_WORK }).click();
  const start = page.getByRole('button', { name: 'Empezar', exact: true });

  await expect(start).toBeDisabled();
  await expect(page.getByText('Dime primero para quién es.')).toBeVisible();

  await page.locator('.pick').first().click();
  await expect(page.getByText('Dime qué quieres hacer.')).toBeVisible();

  await page.locator('.door', { hasText: 'Adaptar algo que tengo' }).click();
  await expect(page.getByText('Dime qué es este material.')).toBeVisible();
  await expect(start).toBeDisabled();

  await page.locator('.door', { hasText: KIND_WORKSHEET }).click();
  await expect(start).toBeEnabled();
}

/* ── The screens the rail reaches (025 T015) ──────────────────────────────── */

/**
 * Every top-level screen, by the name she reads.
 *
 * `025` moved «Mi servicio de IA» and «Acerca de» into Configuración, so they are one
 * level deeper. Three specs hand-rolled `getByRole('button', {name}).click()` over a
 * flat list and all three broke — which is the right outcome and exactly what this
 * file's opening note says: «a spec that hand-rolls a walk is a spec that quietly stops
 * testing the navigation the day one of its steps changes».
 *
 * So the walk is here and the sweeps iterate over `SCREENS`.
 */
export const SCREENS = [
  { label: RAIL_WORK },
  { label: 'Mis alumnos' },
  { label: 'Mis notas' },
  { label: 'Pictogramas', under: 'Configuración' },
  { label: 'Mi servicio de IA', under: 'Configuración' },
  { label: 'Acerca de y licencias', under: 'Configuración' },
] as const;

/**
 * Walk to one of them.
 *
 * `exact: true` throughout, because Playwright matches an accessible name by
 * **substring** and this application has «Parar» inside «Preparar», «Preparar material»
 * inside nothing but next to «Preparar», and «Configuración» twice once she is in it
 * (the rail's heading is an `h2`, not a button, but the entry and the section share
 * prefixes). Twenty minutes went into a defect that was in a locator.
 */
export async function toScreen(
  page: Page, screen: { label: string; under?: string },
): Promise<void> {
  const target = page.getByRole('button', { name: screen.label, exact: true });

  /*
   * ## The rail has three shapes, so the walk needs two steps
   *
   * `020` option A: **one** column that becomes the learner's inside a learner and
   * Configuración's inside Configuración. Which means neither of the naive versions of
   * this helper works, and both were written before this one:
   *
   * 1. «Always click `under` first» hung walking *between* Configuración's own sections:
   *    the «Configuración» entry has been replaced by the sections it leads to. Seven
   *    tests, all «waiting for getByRole('button', { name: 'Configuración' })».
   * 2. «Descend only if the target is not visible» then hung on the *next* width of the
   *    sweep, coming back to a top-level entry while still inside Configuración:
   *    «waiting for 'Preparar material'».
   *
   * So: if the target is not on screen, come out to the caseload first — the rail always
   * offers that, in every shape — and then descend if the destination is nested. Two
   * clicks at most, and no shape it cannot leave.
   *
   * The rail is right and the helper was wrong both times, which is why the fix is here
   * and not a redundant «Configuración» entry kept on screen for a test's convenience.
   */
  if (!(await target.isVisible())) {
    await toCaseload(page);
    if (screen.under) {
      await page.getByRole('button', { name: screen.under, exact: true }).click();
      await page.waitForTimeout(150);
    }
  }
  await target.click();
  await page.waitForTimeout(200);
}
