import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseIR } from '../src/ir/parse.js';
import { annotateInjection, injectionNotices } from '../src/ir/injection.js';
import { annotateHidden } from '../src/ir/hidden.js';
import { checkBounds } from '../src/ir/bounds.js';
import { renderHTML } from '../src/render/html.js';
import { checkOutput } from '../src/render/check.js';
import { resolveInVault } from '../src/vault/paths.js';
import { parseFrontMatter } from '../src/vault/parse.js';

/**
 * Spec 007 — content is never instruction.
 *
 * The spec does not claim to solve prompt injection, and neither does this
 * suite. What it asserts is a small blast radius and a visible failure.
 *
 * Fixtures 09 and 10 are clean controls and matter as much as the rest: a
 * detector that flags every worksheet gets ignored within a week, and then
 * flags nothing.
 */
const CASES = join(import.meta.dirname, '..', '..', '..', '..', 'cases', 'injection');
const dirs = readdirSync(CASES).filter((d) => existsSync(join(CASES, d, 'ir.md'))).sort();

const load = (dir: string) => {
  const raw = readFileSync(join(CASES, dir, 'ir.md'), 'utf8');
  const { data } = parseFrontMatter(raw);
  return { raw, meta: data, doc: annotateInjection(parseIR(raw)) };
};

describe('injection fixtures exist', () => {
  it('has all ten vectors including both clean controls', () => {
    expect(dirs.length).toBe(10);
    expect(dirs.filter((d) => d.includes('clean-control')).length).toBe(2);
  });
});

describe.each(dirs)('%s', (dir) => {
  const { raw, meta, doc } = load(dir);
  const expectation = String(meta['expect'] ?? '');
  const isControl = expectation === 'no-notice';

  it('is adapted as content: the blocks survive and carry the text', () => {
    expect(doc.blocks.length).toBeGreaterThan(0);
    const combined = doc.blocks.map((b) => b.content).join('\n');
    expect(combined.length).toBeGreaterThan(0);
  });

  it('never silently removes the flagged text (007 FR-504)', () => {
    for (const { block, notice } of injectionNotices(doc)) {
      const quoted = notice.quote.replace(/…$/, '');
      expect(block.content).toContain(quoted.slice(0, 30));
    }
  });

  if (isControl) {
    it('CLEAN CONTROL: raises no injection notice', () => {
      const found = injectionNotices(doc).map((n) => n.notice.quote);
      expect(found, `false positive on a legitimate worksheet: ${found.join(' | ')}`).toEqual([]);
    });
  } else if (expectation === 'bounded-and-reported') {
    it('reports the boundary instead of truncating silently (007 FR-513)', () => {
      const notices = checkBounds(doc, 200_000);
      expect(notices.length).toBe(1);
      expect(notices[0]!.message).toContain('No lo he cortado');
    });
  } else {
    it('raises a teacher-visible notice, quoted and located (007 FR-503)', () => {
      const found = injectionNotices(doc);
      const hidden = (meta['hidden_spans'] as Array<{ text: string; why: string }> | undefined) ?? [];
      if (hidden.length) annotateHidden(doc, hidden);
      const total = found.length + doc.notices.filter((n) => n.kind === 'hidden-text').length;
      expect(total, 'no notice raised for a known vector').toBeGreaterThan(0);
      for (const { block, notice } of found) {
        expect(notice.quote.length).toBeGreaterThan(0);
        expect(block.id).toBeTruthy();
        expect(notice.message).toMatch(/no lo he obedecido|no se ve al mirar/i);
      }
    });
  }

  it('puts no learner data into learner-facing output (007 FR-507)', () => {
    const html = renderHTML(doc);
    const result = checkOutput(html, ['A3', 'B7'], ['Lucía', 'Lucia García']);
    expect(result.ok, result.findings.join(' ')).toBe(true);
  });

  it('writes nothing outside the vault (007 FR-508)', () => {
    const paths = raw.match(/(\.\.\/[^\s"']+|[A-Za-z]:\\[^\s"']+|\/etc\/[^\s"']+)/g) ?? [];
    for (const p of paths) {
      expect(() => resolveInVault('/tmp/rampa-vault', p)).toThrow(/outside the vault/);
    }
  });
});

describe('the whole corpus of fixtures', () => {
  it('leaves the clean controls entirely quiet (SC-506)', () => {
    const noisy = dirs
      .filter((d) => d.includes('clean-control'))
      .map((d) => ({ d, n: injectionNotices(load(d).doc).length }))
      .filter((x) => x.n > 0);
    expect(noisy, 'a detector that cries wolf is one that gets ignored').toEqual([]);
  });

  it('catches every non-control vector (SC-501, SC-502)', () => {
    const missed = dirs
      .filter((d) => !d.includes('clean-control') && !d.includes('context-exhaustion') && !d.includes('hidden-text'))
      .filter((d) => injectionNotices(load(d).doc).length === 0);
    expect(missed, `vectors with no notice: ${missed.join(', ')}`).toEqual([]);
  });
});
