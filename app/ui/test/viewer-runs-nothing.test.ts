import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { seal } from '../src/viewer/seal.js';

/**
 * The viewer runs nothing the document contains (021 T014, FR-1924).
 *
 * Principle IX, and not caution: a **composed** document rests on an anchor she pasted —
 * a textbook page, a colleague's file, something off a web page — and an **adapted** one
 * contains material somebody else wrote. `007` treats every such passage as content. A
 * viewer that executed markup from it would be the single place in this application where
 * content becomes instruction.
 *
 * Two halves, and both are needed:
 *
 * - The **frame** grants nothing: `sandbox=""` with no `allow-scripts` and no
 *   `allow-same-origin`, and `srcDoc` rather than a path so nothing is served and nothing
 *   can be requested relative to it.
 * - The **policy** inside the document denies every remote fetch, so an `<img
 *   src="http://…">` planted in a worksheet cannot phone home — which would turn opening
 *   a sheet into a signal that a teacher opened it.
 */
const src = readFileSync(
  join(dirname(new URL(import.meta.url).pathname), '..', 'src', 'viewer', 'DocumentViewer.tsx'),
  'utf8');

/**
 * The `<iframe …>` element, comments stripped.
 *
 * Over the element rather than the file, and the first draft of this test is why: it
 * asserted `src` contains no «allow-scripts» — and the component's own comment explains
 * that it grants no `allow-scripts`, so the check failed on its own documentation. That
 * is the eighth over-specified assertion in this project, and the fix is the same every
 * time: assert what the code does, not what the file says.
 */
const iframeTag = ((): string => {
  const noComments = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  return /<iframe[\s\S]*?\/>/.exec(noComments)?.[0] ?? '';
})();

describe('the frame grants nothing', () => {
  it('is found at all, so the assertions below are not vacuous', () => {
    expect(iframeTag).toContain('<iframe');
  });

  it('has an empty sandbox, and never allows scripts or same-origin', () => {
    expect(iframeTag).toMatch(/sandbox=""/);
    expect(iframeTag).not.toContain('allow-');
  });

  it('supplies the document inline rather than by path', () => {
    // A `src` would be a served document, and anything relative inside it would resolve
    // against something. `srcDoc` has no base to resolve against.
    expect(iframeTag).toContain('srcDoc=');
    expect(iframeTag).not.toMatch(/\ssrc=/);
  });
});

describe('the policy denies what a document might ask for', () => {
  const sealed = seal('<!doctype html><html lang="es"><head><title>x</title></head>'
    + '<body><p>hola</p></body></html>');

  it('denies everything by default', () => {
    expect(sealed).toContain("default-src 'none'");
  });

  it('allows the sheet’s own inline styles, because the presentation is ours', () => {
    // `renderHTML` carries her presentation in a `<style>` block. That is the one thing
    // on this path we wrote ourselves.
    expect(sealed).toContain("style-src 'unsafe-inline'");
  });

  it('allows no remote anything', () => {
    const policy = /content="([^"]+)"/.exec(sealed)?.[1] ?? '';
    expect(policy).not.toMatch(/https?:/);
    expect(policy).not.toContain('*');
    // Data URIs for images only — that is how pictograms reach a rendered sheet (018).
    expect(policy).toContain('img-src data:');
  });

  it('puts the policy inside <head>, so it governs the document', () => {
    expect(sealed.indexOf('Content-Security-Policy')).toBeGreaterThan(sealed.indexOf('<head>'));
    expect(sealed.indexOf('Content-Security-Policy')).toBeLessThan(sealed.indexOf('<body>'));
  });

  it('does not put a meta before the doctype', () => {
    /*
     * A `<meta>` ahead of `<!doctype>` drops the page into quirks mode, which changes how
     * it lays out — and on a page she is about to print that is not cosmetic. So a
     * document with no `<head>` gets the policy first *and* keeps working, and one with a
     * head gets it inside.
     */
    expect(sealed.startsWith('<!doctype html>')).toBe(true);
  });

  it('still seals a document that has no head at all', () => {
    const bare = seal('<p>hola</p>');
    expect(bare).toContain("default-src 'none'");
    expect(bare).toContain('<p>hola</p>');
  });
});
