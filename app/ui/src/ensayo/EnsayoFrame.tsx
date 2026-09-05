import type { ReactNode } from 'react';

/**
 * The rehearsal mark, structurally (035 T010, FR-3305, SC-3304).
 *
 * ## Why a frame and not a banner on each screen
 *
 * «Every rehearsal screen is marked» is the kind of claim that is true when it is written
 * and false four screens later — somebody adds one, forgets the banner, and the screen
 * that looks most like the real application is the one with no mark on it.
 *
 * So the mark is a property of the **component tree**: every rehearsal screen renders
 * inside this, and no rehearsal screen exists outside it. That is checkable by a test that
 * reads the imports, which is what `ensayo-frame.test.tsx` does, and it cannot be
 * satisfied by remembering.
 *
 * ## What it must never let her believe
 *
 * That a sample sheet is her pupil's. She is here because she has no key yet and wants to
 * see what this does — the worst outcome is not confusion, it is a teacher printing the
 * example and handing it to a child. So the mark says what this is in words, and the
 * documents carry «material de ejemplo» themselves so the printed page says it too, with
 * no renderer branch (T005).
 *
 * Built from the shell's own pieces: a frame that invents its own layout is a fact about
 * the shell that the shell does not know (`013`).
 */
export function EnsayoFrame({ children, onLeave }: {
  children: ReactNode;
  /** «Salir del ensayo» — always available, never a step she has to finish. */
  onLeave: () => void;
}) {
  return (
    <div className="ensayo-frame">
      {/*
        `role="status"` and not `alert`: it is a standing fact about where she is, not an
        interruption. It is announced once when the region appears, which is what a person
        arriving at the rehearsal needs — and it does not re-announce on every screen
        change, which is what would make a screen reader user leave.
      */}
      <div className="ensayo-mark" role="status">
        <strong>Estás en un ensayo.</strong> Todo lo que ves aquí es un ejemplo inventado:
        el alumno no existe y la hoja no es de nadie. No cuesta dinero y no sale nada de
        tu ordenador.
        <button className="btn btn-sm btn-ghost" onClick={onLeave}>
          Salir del ensayo
        </button>
      </div>
      {children}
    </div>
  );
}
