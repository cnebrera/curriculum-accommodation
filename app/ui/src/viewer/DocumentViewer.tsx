import { seal } from './seal.js';

/**
 * The document, on screen, inside Rampa (021 T014, FR-1905/FR-1924).
 *
 * ## Why it exists
 *
 * «Abrir» used to mean opening a `.md` in her own editor. That is right for editing — the
 * vault is hers and Rampa is a guest in those files — and useless for the thing she
 * actually wants at 8pm: to look at the sheet she is about to print.
 *
 * ## It shows the printer's own HTML, deliberately
 *
 * Rendering the document a second time for the screen would be a second renderer: two
 * implementations of what the page looks like, and **the one she checks would not be the
 * one she prints**. So this is `renderHTML`'s output, the same bytes that become the PDF.
 *
 * ## Nothing in the document runs
 *
 * FR-1924, and it is Principle IX rather than caution. A composed document rests on an
 * anchor **she pasted** — a textbook page, a colleague's file, something off a web page —
 * and `007` treats every such passage as content. An adapted document contains material
 * somebody else wrote. So:
 *
 * - `sandbox` with **no** `allow-scripts` and no `allow-same-origin`: scripts cannot run,
 *   and the frame cannot reach back into the application.
 * - `srcdoc` rather than a path: nothing is served, so nothing can be requested relative
 *   to it.
 * - A CSP inside the frame that denies every remote fetch, so an `<img src="http://…">`
 *   planted in a document cannot phone home — which would turn opening a worksheet into a
 *   signal that a teacher opened it.
 *
 * `renderHTML` emits no `<script>` — asserted in `packages/core`, zero occurrences — so
 * none of this is compensating for what we generate. It is the guarantee for what the
 * document may contain.
 */

export function DocumentViewer({ html, title, onClose }: {
  html: string;
  /** What this document is, in her words — «la ficha», «el examen», «las soluciones». */
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="viewer">
      <div className="viewer-bar">
        <strong>{title}</strong>
        <button className="btn btn-sm" onClick={onClose}>Cerrar</button>
      </div>
      {/*
        `title` on the frame is what a screen reader announces, so it says what the
        document is rather than «frame». The sandbox attribute is empty on purpose:
        every permission is opt-in, and this opts into none.
      */}
      <iframe
        className="viewer-frame"
        title={title}
        sandbox=""
        srcDoc={seal(html)}
      />
    </div>
  );
}
