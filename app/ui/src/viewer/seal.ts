/**
 * The policy the viewer wraps a document in (021 T014, FR-1924).
 *
 * Its own module because it is **logic, not presentation**, and because a test that
 * duplicated this policy would be a test that keeps passing while the viewer's real one
 * drifts. `e2e/composed.spec.ts` plants a script, an inline handler, a remote image and a
 * link in a document and seals it with *this* function.
 */
/**
 * Injected as the frame's first child, so it governs the document that follows.
 *
 * `default-src 'none'` then allowing only inline styles: the rendered sheet carries its
 * presentation in a `<style>` block, and that is ours. Everything else — images, fonts,
 * frames, connections — is denied rather than restricted, because a sheet that needs the
 * network is a sheet that has been tampered with.
 */
const FRAME_CSP =
  "<meta http-equiv=\"Content-Security-Policy\" content=\""
  + "default-src 'none'; style-src 'unsafe-inline'; img-src data:;"
  + "\">";

/** The document, with our policy in front of it. */
export function seal(html: string): string {
  // After `<head>` when there is one, at the very start otherwise — a `<meta>` before
  // `<!doctype>` would put the document into quirks mode and change how it lays out,
  // which on a page she is about to print is not a cosmetic difference.
  const head = html.indexOf('<head>');
  return head === -1
    ? FRAME_CSP + html
    : html.slice(0, head + '<head>'.length) + FRAME_CSP + html.slice(head + '<head>'.length);
}
