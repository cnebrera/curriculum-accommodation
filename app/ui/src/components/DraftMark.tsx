/**
 * The most important state in the product (spec 010 US4, T023).
 *
 * She will see this on every worksheet she ever produces, before every
 * signature. So it is unmistakable and **calm**: loud enough to be an alarm
 * would make the application feel permanently in error, and an alarm that fires
 * every time stops being seen within a fortnight.
 *
 * The state is in words as well as in colour and form (FR-812/FR-821), and the
 * hatch behind it runs at the logo's 1:12 — the accessible gradient in building
 * code — so the mark and the product's key signal share a geometry.
 *
 * `role="status"` rather than `alert`: it is the document's state, not a fault.
 */
export function DraftMark({ signedOff, signedOn }: { signedOff: boolean; signedOn?: string }) {
  if (signedOff) {
    return (
      <div className="signedbar" role="status">
        <span aria-hidden="true" style={{ color: 'var(--ok)', fontWeight: 700, fontSize: '1.1rem' }}>✓</span>
        <div>
          <div className="txt">Firmada por ti{signedOn ? ` · ${signedOn}` : ''}</div>
          <div className="sub">Ya no lleva marca de borrador. Lista para clase.</div>
        </div>
      </div>
    );
  }
  return (
    <div className="draftbar" role="status">
      <span className="dot" aria-hidden="true" />
      <div>
        <div className="txt">Borrador · sin revisar</div>
        <div className="sub">No la entregues todavía. La marca se va cuando la firmes.</div>
      </div>
    </div>
  );
}
