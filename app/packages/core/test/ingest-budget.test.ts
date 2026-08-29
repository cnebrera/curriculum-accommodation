import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parseIngestBudget, DEFAULT_BUDGET } from '../src/ingest/budget.js';

/**
 * The loop's budget, from the corpus (008 T009, quickstart §2).
 *
 * Read from the **shipped** `instructions/ingest.md`, so a number edited into the
 * real file is a number this suite re-checks. Testing against an invented fixture
 * would pass forever while the file the application actually reads drifted.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const shipped = readFileSync(join(repoRoot, 'instructions', 'ingest.md'), 'utf8');

describe('the shipped budget', () => {
  const budget = parseIngestBudget(shipped);

  it('declares all four values in the corpus, not in code', () => {
    // FR-617. If this ever falls back to the defaults, the front matter has been
    // lost and the numbers have silently moved back into TypeScript.
    for (const key of ['attempts_per_page', 'pages_per_job', 'image_long_edge', 'image_quality']) {
      expect(shipped, `${key} is not in the front matter`).toContain(key);
    }
  });

  it('is within the bounds the code enforces, so nothing is being clamped', () => {
    expect(budget.attemptsPerPage).toBeGreaterThanOrEqual(1);
    expect(budget.attemptsPerPage).toBeLessThanOrEqual(4);
    expect(budget.pagesPerJob).toBeGreaterThanOrEqual(1);
    expect(budget.pagesPerJob).toBeLessThanOrEqual(100);
    expect(budget.imageLongEdge).toBeGreaterThanOrEqual(800);
    expect(budget.imageLongEdge).toBeLessThanOrEqual(3000);
  });

  it('keeps the retry bound small, because a third attempt costs and rarely differs', () => {
    expect(budget.attemptsPerPage).toBeLessThanOrEqual(3);
  });

  it('bounds a job to a unit of work rather than a book (007 FR-513)', () => {
    expect(budget.pagesPerJob).toBeLessThanOrEqual(40);
  });

  it('keeps the image legible for 11pt print', () => {
    // Below ~1100px superscripts and the comma/full-stop distinction start to go,
    // and both matter in a worksheet.
    expect(budget.imageLongEdge).toBeGreaterThanOrEqual(1100);
  });
});

describe('a corpus edit cannot spend her money', () => {
  const withFrontMatter = (yaml: string) => `---\n${yaml}\n---\n\n# Reading the material\n`;

  it('clamps an absurd retry bound rather than obeying it', () => {
    /*
     * The reason the floor and ceiling are in code: a corpus is editable content,
     * and `attempts_per_page: 500` on a dark photograph would bill a teacher five
     * hundred times. Code protects her from the file; it does not implement it.
     */
    expect(parseIngestBudget(withFrontMatter('attempts_per_page: 500')).attemptsPerPage).toBe(4);
    expect(parseIngestBudget(withFrontMatter('attempts_per_page: 0')).attemptsPerPage).toBe(1);
    expect(parseIngestBudget(withFrontMatter('attempts_per_page: -3')).attemptsPerPage).toBe(1);
  });

  it('clamps an absurd page bound', () => {
    expect(parseIngestBudget(withFrontMatter('pages_per_job: 100000')).pagesPerJob).toBe(100);
  });

  it('clamps an image size that would cost a fortune or be illegible', () => {
    expect(parseIngestBudget(withFrontMatter('image_long_edge: 12000')).imageLongEdge).toBe(3000);
    expect(parseIngestBudget(withFrontMatter('image_long_edge: 50')).imageLongEdge).toBe(800);
  });

  it('falls back on a value it cannot read, rather than producing NaN', () => {
    const b = parseIngestBudget(withFrontMatter('attempts_per_page: "dos"\npages_per_job: sí'));
    expect(b.attemptsPerPage).toBe(DEFAULT_BUDGET.attemptsPerPage);
    expect(b.pagesPerJob).toBe(DEFAULT_BUDGET.pagesPerJob);
  });

  it('falls back on a file with no front matter at all', () => {
    expect(parseIngestBudget('# Reading the material\n\nJust prose.')).toEqual(DEFAULT_BUDGET);
  });

  it('falls back on an empty file rather than throwing', () => {
    expect(parseIngestBudget('')).toEqual(DEFAULT_BUDGET);
  });

  it('takes a value in the middle of the range as written', () => {
    const b = parseIngestBudget(withFrontMatter('attempts_per_page: 3\nimage_long_edge: 2048'));
    expect(b.attemptsPerPage).toBe(3);
    expect(b.imageLongEdge).toBe(2048);
  });

  it('rounds a fractional count rather than half-attempting a page', () => {
    expect(parseIngestBudget(withFrontMatter('attempts_per_page: 2.6')).attemptsPerPage).toBe(3);
  });

  it('keeps quality fractional, because it is a fraction', () => {
    expect(parseIngestBudget(withFrontMatter('image_quality: 0.7')).imageQuality).toBe(0.7);
    expect(parseIngestBudget(withFrontMatter('image_quality: 5')).imageQuality).toBe(0.95);
  });
});
