import { describe, it, expect } from 'vitest';
import {
  parseDatedSections, findRepeatedThemes, similarity, retentionCandidates,
  archiveCandidates, buildProposals,
} from '../src/memory/consolidate.js';
import type { JournalDoc } from '../src/memory/index.js';

const notes = `---
learner: A3
updated: 2026-10-02
---

## 2026-09-04 · Casillas
Las casillas se las cuenta como tareas y se bloquea.

## 2026-09-11 · Primer ejercicio
Con el primer ejercicio hecho arranca sola.

## 2026-09-18 · Casillas otra vez
Otra vez las casillas: se las cuenta como tareas.

## 2026-10-02 · Casillas
Las casillas contadas como tareas, se bloquea igual.
`;

describe('consolidation proposes, with the evidence attached (003 US3, T093)', () => {
  it('reads the dated sections a teacher actually wrote', () => {
    const sections = parseDatedSections(notes);
    expect(sections).toHaveLength(4);
    expect(sections[0]!.date).toBe('2026-09-04');
    expect(sections[0]!.heading).toBe('Casillas');
    expect(sections[3]!.body).toContain('se bloquea igual');
  });

  it('finds a theme that repeats three times, and keeps every occurrence as evidence', () => {
    const themes = findRepeatedThemes(parseDatedSections(notes));
    expect(themes).toHaveLength(1);
    expect(themes[0]!.occurrences).toHaveLength(3);
    // The evidence is what makes it a judgement she can confirm rather than
    // rubber-stamp, so the dates must survive into the proposal.
    expect(themes[0]!.occurrences.map((o) => o.date))
      .toEqual(['2026-09-04', '2026-09-18', '2026-10-02']);
    expect(themes[0]!.text).toContain('casillas');
  });

  it('does not propose a note that happened once', () => {
    const themes = findRepeatedThemes(parseDatedSections(notes));
    expect(themes.some((t) => t.text.includes('arranca sola'))).toBe(false);
  });

  it('needs a real overlap, not a shared stop word', () => {
    expect(similarity('las casillas se cuentan como tareas', 'las casillas son tareas'))
      .toBeGreaterThanOrEqual(0.5);
    expect(similarity('el examen de naturales', 'la ficha de lengua')).toBeLessThan(0.5);
  });
});

describe('retention asks, and never acts (003 FR-219)', () => {
  const stale = `---\nlearner: Z9\n---\n\n## 2024-05-01 · Algo\nHace mucho.\n`;
  const fresh = `---\nlearner: A3\n---\n\n## 2026-08-01 · Algo\nReciente.\n`;

  it('surfaces a learner past the period', () => {
    const out = retentionCandidates(
      [{ code: 'Z9', notes: stale }, { code: 'A3', notes: fresh }], '2026-08-28');
    expect(out.map((c) => c.code)).toEqual(['Z9']);
    expect(out[0]!.daysInactive).toBeGreaterThan(365);
  });

  it('says nothing about a learner still in use', () => {
    const out = retentionCandidates([{ code: 'A3', notes: fresh }], '2026-08-28');
    expect(out.filter((c) => c.daysInactive !== null)).toHaveLength(0);
  });
});

describe('archiving is proposed, never deletion (003 FR-211)', () => {
  const entry = (path: string, date: string, status: JournalDoc['status'], recipes: string[]): JournalDoc =>
    ({ path, date, status, recipes, scope: 'corpus', body: 'x' });

  it('proposes what was already promoted', () => {
    const out = archiveCandidates([entry('a.md', '2026-09-01', 'promoted', ['r1'])]);
    expect(out.map((e) => e.path)).toEqual(['a.md']);
  });

  it('proposes the older of two open entries on the same recipe', () => {
    const out = archiveCandidates([
      entry('old.md', '2026-09-01', 'open', ['lectura-facil-es']),
      entry('new.md', '2026-10-01', 'open', ['lectura-facil-es']),
    ]);
    expect(out.map((e) => e.path)).toEqual(['old.md']);
  });

  it('leaves a single open entry alone', () => {
    expect(archiveCandidates([entry('only.md', '2026-09-01', 'open', ['r1'])])).toHaveLength(0);
  });
});

describe('the whole proposal set', () => {
  it('reports the house-style overflow the loop already computed', () => {
    const p = buildProposals({
      learners: [], journal: [], house: 'x'.repeat(7000), today: '2026-08-28',
    });
    expect(p.houseOverflowing).toBe(true);
    expect(p.houseChars).toBe(7000);
  });

  it('is empty when there is nothing to do', () => {
    const p = buildProposals({ learners: [], journal: [], house: '', today: '2026-08-28' });
    expect(p.learnerThemes).toHaveLength(0);
    expect(p.archive).toHaveLength(0);
    expect(p.retention).toHaveLength(0);
    expect(p.houseOverflowing).toBe(false);
  });
});
