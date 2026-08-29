import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { loadCatalogue, type ServiceEntry } from '../src/providers/catalogue.js';
import { recommend } from '../src/providers/recommend.js';

/**
 * The recommendation rule (009 T009, quickstart §2).
 *
 * This is the logic in the feature most likely to be wrong in a way nobody
 * notices. A rule that quietly recommends the cheapest service for a child's
 * data would look completely fine in a screenshot, in a demo, and in a review —
 * the screen would show one service, one confident sentence, and nothing at all
 * to indicate that the sentence was reached badly.
 *
 * So the two tests that matter most are the ones that assert something is
 * *never* recommended, and they run against the shipped catalogue.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const dir = join(repoRoot, 'instructions', 'providers');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.md') && f !== 'README.md')
  .map((f) => ({ path: f, raw: readFileSync(join(dir, f), 'utf8') }));

const ADAPTERS = ['google', 'anthropic', 'openai', 'compatible'] as const;
const TODAY = new Date('2026-09-15T00:00:00Z');
const catalogue = loadCatalogue(files, { available: ADAPTERS, today: TODAY });

const ok = (o: ReturnType<typeof recommend>) => {
  if (!o.ok) throw new Error(`expected a recommendation, got a conflict: ${o.message}`);
  return o;
};

describe('one question, then one recommendation', () => {
  it('recommends something when she can use a card', () => {
    const r = ok(recommend(catalogue, { canUseCard: true }, TODAY));
    expect(r.service.id).toBeTruthy();
    expect(r.reason.length).toBeGreaterThan(15);
    expect(r.reason.endsWith('.')).toBe(true);
  });

  it('recommends something when she cannot', () => {
    const r = ok(recommend(catalogue, { canUseCard: false }, TODAY));
    expect(r.service.requiresCard).toBe(false);
  });

  it('gives a reason she could repeat to her head teacher', () => {
    const r = ok(recommend(catalogue, { canUseCard: false }, TODAY));
    // Assembled from the rule, so it names the properties that decided it.
    expect(r.reason).toMatch(/tarjeta/i);
    expect(r.reason).not.toMatch(/quality|provisional|rank|jurisdiction|adapter/i);
  });

  it('offers the runners-up, so "why not another" is answerable', () => {
    const r = ok(recommend(catalogue, { canUseCard: true }, TODAY));
    expect(r.alternatives.length).toBeGreaterThan(0);
    expect(r.alternatives.map((s) => s.id)).not.toContain(r.service.id);
  });
});

describe('what is never recommended', () => {
  /**
   * The test this whole module exists for.
   *
   * DeepSeek is the cheapest service in the catalogue by a wide margin. It is
   * processed in China and its terms are unclear about training. A rule that
   * ranked on cost, or on cost after quality, would recommend it — and the
   * teacher reading that recommendation is acting for a child.
   */
  it('never recommends a service processed somewhere it cannot name, even when it is cheapest', () => {
    const cheapest = [...catalogue].sort((a, b) => a.costCents - b.costCents)[0]!;
    expect(cheapest.jurisdiction === 'other' || cheapest.costCents === 0).toBe(true);

    for (const canUseCard of [true, false]) {
      const o = recommend(catalogue, { canUseCard }, TODAY);
      if (o.ok) {
        expect(['eu', 'us'], `recommended ${o.service.id}`).toContain(o.service.jurisdiction);
      }
    }
  });

  it('never recommends `other` even when it is the only thing left', () => {
    // Constructed so that the *only* survivor is a jurisdiction we cannot name.
    // The rule must return a conflict rather than fall back to it.
    const onlyDeepseek = catalogue.filter((s) => s.id === 'deepseek');
    const o = recommend(onlyDeepseek, { canUseCard: true }, TODAY);
    expect(o.ok).toBe(false);
    if (!o.ok) {
      expect(o.because).toBe('jurisdiction');
      // And it does not end on a dead end.
      expect(o.suggestion.length).toBeGreaterThan(20);
      expect(o.suggestion).toMatch(/lista completa/i);
    }
  });

  it('never recommends an aggregator, because "depende" is not an answer a school can act on', () => {
    const varies: ServiceEntry = { ...catalogue[0]!, id: 'agg', jurisdiction: 'varies', quality: 0, costCents: 0 };
    const o = recommend([varies], { canUseCard: true }, TODAY);
    expect(o.ok).toBe(false);
  });

  /**
   * The second test that matters. Spec 008 makes photographs the normal input:
   * the textbook is on the publisher's platform and cannot be exported, so she
   * photographs the page. A free recommendation that cannot read a photograph
   * is a dead end she discovers on Tuesday, in a 45-minute gap.
   */
  it('never recommends a no-card service that cannot read photographs', () => {
    const o = recommend(catalogue, { canUseCard: false }, TODAY);
    if (o.ok) expect(o.service.vision, `recommended ${o.service.id}`).toBe(true);
  });

  it('returns the conflict rather than a blind recommendation when no free service reads photos', () => {
    const blind = catalogue
      .filter((s) => !s.requiresCard)
      .map((s) => ({ ...s, vision: false }));
    const o = recommend(blind, { canUseCard: false }, TODAY);
    expect(o.ok).toBe(false);
    if (!o.ok) expect(o.because).toBe('vision');
  });
});

describe('her optional answer about where the data goes', () => {
  it('leaves the recommendation unchanged when she does not know', () => {
    // FR-708: "no lo sé" is first-class. A teacher who has not been told what
    // her school requires must not end up worse off than one who has.
    const withoutAnswer = recommend(catalogue, { canUseCard: true }, TODAY);
    const withUndefined = recommend(catalogue, { canUseCard: true, locationConstraint: undefined }, TODAY);
    expect(ok(withUndefined).service.id).toBe(ok(withoutAnswer).service.id);
  });

  it('honours a stated EU requirement and says so in the reason', () => {
    const r = ok(recommend(catalogue, { canUseCard: true, locationConstraint: 'eu' }, TODAY));
    expect(r.service.jurisdiction).toBe('eu');
    expect(r.reason).toMatch(/Unión Europea/);
    expect(r.reason).toMatch(/como pediste/);
  });

  it('states the conflict when nothing satisfies the requirement', () => {
    const noEu = catalogue.filter((s) => s.jurisdiction !== 'eu');
    const o = recommend(noEu, { canUseCard: true, locationConstraint: 'eu' }, TODAY);
    expect(o.ok).toBe(false);
    if (!o.ok) {
      expect(o.because).toBe('location');
      expect(o.message).toMatch(/Unión Europea/);
      expect(o.suggestion).toMatch(/centro/i);
    }
  });
});

describe('conflicts always carry a next step (FR-713)', () => {
  it('when every service needs a card', () => {
    const paidOnly = catalogue.map((s) => ({ ...s, requiresCard: true }));
    const o = recommend(paidOnly, { canUseCard: false }, TODAY);
    expect(o.ok).toBe(false);
    if (!o.ok) {
      expect(o.because).toBe('card');
      expect(o.suggestion).toMatch(/centro|decidir/i);
    }
  });

  it('when the catalogue is empty, and blames the program rather than her', () => {
    const o = recommend([], { canUseCard: true }, TODAY);
    expect(o.ok).toBe(false);
    if (!o.ok) {
      expect(o.because).toBe('no-services');
      expect(o.suggestion).toMatch(/no tuyo/i);
    }
  });

  it('never returns a conflict with an empty suggestion', () => {
    const cases = [
      recommend([], { canUseCard: true }, TODAY),
      recommend(catalogue.map((s) => ({ ...s, requiresCard: true })), { canUseCard: false }, TODAY),
      recommend(catalogue.filter((s) => s.id === 'deepseek'), { canUseCard: true }, TODAY),
    ];
    for (const o of cases) {
      expect(o.ok).toBe(false);
      if (!o.ok) {
        expect(o.message.length).toBeGreaterThan(15);
        expect(o.suggestion.length).toBeGreaterThan(15);
      }
    }
  });
});

describe('the rule ignores stale facts even if the caller did not filter them', () => {
  it('drops a year-old entry before ranking', () => {
    // `loadCatalogue` already filters, but the rule must not depend on that:
    // a caller passing an unfiltered list must not get a stale recommendation.
    const o = recommend(catalogue, { canUseCard: true }, new Date('2028-01-01T00:00:00Z'));
    expect(o.ok).toBe(false);
    if (!o.ok) expect(o.because).toBe('no-services');
  });
});

describe('the reason cannot drift from the decision', () => {
  it('claims measured quality only when quality is measured', () => {
    // Every shipped entry is `unmeasured` today, so the reason must not say
    // "el que mejor ha salido en nuestras pruebas" for any of them.
    const r = ok(recommend(catalogue, { canUseCard: true }, TODAY));
    expect(r.service.quality).toBe('unmeasured');
    expect(r.reason).not.toMatch(/mejor ha salido en nuestras pruebas/);
    expect(r.reason).toMatch(/aún no hemos medido|no pide tarjeta|Unión Europea|encaja/);
  });

  it('claims measured quality when it genuinely is measured', () => {
    const measured = catalogue.map((s) =>
      s.id === 'mistral' ? { ...s, quality: 0 } : { ...s, quality: 5 });
    const r = ok(recommend(measured, { canUseCard: true }, TODAY));
    expect(r.service.id).toBe('mistral');
    expect(r.reason).toMatch(/mejor ha salido en nuestras pruebas/);
  });

  it('never claims a comparison that has not been run', () => {
    /*
     * The defect this was written for. The "there are cheaper ones but they
     * scored worse" clause shipped unconditionally, and every entry is
     * `unmeasured` — so the sentence claimed a comparison that has never
     * happened, in the one function whose whole purpose is that the reason
     * cannot drift from the decision. Nineteen tests passed over it.
     */
    for (const canUseCard of [true, false]) {
      const o = recommend(catalogue, { canUseCard }, TODAY);
      if (!o.ok) continue;
      expect(o.service.quality).toBe('unmeasured');
      expect(o.reason, o.reason).not.toMatch(/salieron peor|salió peor|en (nuestras|las) pruebas/);
    }
  });

  it('reads as one sentence, never "a y b y c"', () => {
    for (const answers of [
      { canUseCard: true }, { canUseCard: false },
      { canUseCard: true, locationConstraint: 'eu' as const },
    ]) {
      const r = ok(recommend(catalogue, answers, TODAY));
      // "no pide tarjeta y es gratis, y lee fotos" is fine Spanish. "a y b y c"
      // is not — two joiners with no comma between them, which is what the
      // first joiner produced.
      expect(r.reason, `"${r.reason}"`).not.toMatch(/ y [^,]* y /);
      expect(r.reason, `"${r.reason}"`).not.toMatch(/,\s*,|\s{2,}/);
    }
  });

  it('only claims "no entrena con lo que envíes" when the terms say exactly that', () => {
    const unclear = catalogue.map((s) => ({ ...s, trainsOnInput: 'unclear' as const }));
    const r = ok(recommend(unclear, { canUseCard: true }, TODAY));
    expect(r.reason).not.toMatch(/no entrena/);
  });
});
