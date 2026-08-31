import { expect, type Page } from '@playwright/test';

/**
 * Walking through the door (016), for every spec that used to land on the adapt
 * screen directly.
 *
 * The rail's first control no longer *is* the adapt screen — it is the door, and
 * the door asks three questions before either branch opens. That is the whole
 * structural change `016` made, so it is a helper rather than four copies: a spec
 * that hand-rolls the walk is a spec that quietly stops testing the door the day
 * one of its steps changes.
 */

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
  page: Page, opts: { learnerIndex?: number } = {},
): Promise<void> {
  await page.getByRole('button', { name: RAIL_WORK }).click();
  await page.getByRole('heading', { name: '¿Qué vas a hacer?' }).waitFor();

  await page.locator('.pick').nth(opts.learnerIndex ?? 0).click();
  await page.locator('.door', { hasText: 'Hacer material para que aprenda' }).click();
  await page.getByRole('button', { name: 'Empezar', exact: true }).click();

  await page.locator('#objetivos').waitFor();
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
