/**
 * Exclusive choices, kept visible (spec 010 FR-825's cousin).
 *
 * A `<select className="select">` hides the options, which is wrong wherever the options are the
 * question — the one required question in spec 009, and the scope question in
 * 003, where there is deliberately no default because inferring it is a privacy
 * incident rather than a quality problem.
 *
 * `value` may be null, and that is the point: no pre-selection.
 */
export function Segmented<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
