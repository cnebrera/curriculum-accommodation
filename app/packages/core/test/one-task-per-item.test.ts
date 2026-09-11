import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parseRecipe } from '../src/recipes/index.js';

/**
 * La receta que el contrato citaba y no existía (`039` FR-3710, FR-3711).
 *
 * `docs/ir.md` enseña al modelo el formato de la IR, y su ejemplo de `4a`/`4b` citaba
 * **`one-task-per-item@1`** — que nunca había existido. Así que el documento que define el
 * contrato le enseñaba a citar una receta que no lleva a ninguna parte, y una cita que no
 * lleva a ninguna parte le enseña a la maestra que el informe es decoración.
 *
 * Detrás había además una **regla dura sin nadie que la aplicara**: la 7, «donde partas un
 * ítem, extiende en vez de renumerar: `4a`, `4b`».
 *
 * Lo que este fichero sujeta es lo que no puede depender de que alguien lea la receta: su
 * **alcance**. Partir un ítem es exactamente lo que `exam-access-not-difficulty` nombra
 * como anti-patrón en un examen —«dos respuestas de una parte no son la misma medición que
 * una de dos partes»— así que un `scope` ampliado sin pensar es la forma en que una guarda
 * se salta por accidente.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const raw = readFileSync(
  join(repoRoot, 'recipes', 'core', 'one-task-per-item.md'), 'utf8');
const recipe = parseRecipe(raw, 'core/one-task-per-item.md', 'core');

describe('partir un ítem no puede llegar a un examen por accidente', () => {
  it('existe, y con la versión que el contrato cita', () => {
    expect(recipe).not.toBeNull();
    expect(recipe!.id).toBe('one-task-per-item');
    expect(recipe!.version).toBe(1);
  });

  it('su alcance excluye la evaluación', () => {
    expect(recipe!.scope, 'un examen no se parte en 4a y 4b').not.toContain('assessment');
    expect(recipe!.scope).toContain('exercise');
  });

  /**
   * El conflicto va declarado **aunque el `scope` ya lo impida**, y eso es deliberado:
   * es la red para el día que alguien amplíe el alcance sin leer el porqué. Es la misma
   * forma que `one-task-per-page` ya tiene, resuelta por la decisión P27.
   */
  it('declara su conflicto con la guarda del examen, que es la red del scope', () => {
    expect(recipe!.conflicts).toContain('exam-access-not-difficulty');
  });

  it('dice que se extiende la numeración y nunca se renumera', () => {
    expect(raw).toMatch(/4a/);
    expect(raw).toMatch(/4b/);
    expect(raw.toLowerCase()).toContain('renumber');
  });
});
