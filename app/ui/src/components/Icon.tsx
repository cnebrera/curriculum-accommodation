import type { SVGProps } from 'react';

/**
 * The icon set (041 US3, FR-3916–FR-3918). **Closed.** Thirty drawings, and this file
 * is the whole list; adding one is a decision written in
 * `specs/041-el-acabado-visual/contracts/icon-set.md` before it is a line here.
 *
 * ## Why vendored strokes and not a dependency
 *
 * The drawings are lucide's (ISC — `LICENSE-lucide.txt` beside this file, copied from
 * lucide-react 1.21.0). A dependency would put the catalogue's 1 500 icons one `import`
 * away, and a set nobody can list is a set nobody reviews; five kilobytes of path data
 * is a set anybody can read top to bottom. It also keeps the bundle offline and signed
 * without a new package in it (the constraint every asset here already meets: the
 * typeface ships the same way).
 *
 * ## Why this replaces characters
 *
 * Before this, the interface drew state with font glyphs — `✓ ✕ ▲ ● ◐ ←` — which are a
 * different drawing on every operating system: the `✓` of a chosen card was SF Pro's on
 * a Mac and Segoe UI Symbol's on the school's Windows laptop. A stroke is the same
 * stroke everywhere.
 *
 * ## The rules, which are also the reason there is one component
 *
 * - `aria-hidden` always. **An icon never stands alone**: it sits beside visible text
 *   that says what it means. There are no icon-only controls in this application; the
 *   first one that needs to exist is its own specification (FR-3917).
 * - `1em` by default, so it is the size of the text it sits beside. `20` in the rail.
 *   Anything else is a new case, not a prop.
 * - `currentColor`, so every palette — including high contrast — colours it with the
 *   text it belongs to, and no ratio has to be measured for it separately.
 */
export type IconName = keyof typeof NODES;

/** The set as a list, for the test that keeps it closed — not exported: a test is
 *  not a reader (`exports-have-readers.test.ts`), so the test reads the file. */

type Node = readonly [tag: 'path' | 'circle' | 'rect' | 'line' | 'polyline', attrs: Record<string, string>];

const NODES = {
  'arrow-left': [['path', { d: "m12 19-7-7 7-7" }], ['path', { d: "M19 12H5" }]],
  'users': [['path', { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }], ['path', { d: "M16 3.128a4 4 0 0 1 0 7.744" }], ['path', { d: "M22 21v-2a4 4 0 0 0-3-3.87" }], ['circle', { cx: "9", cy: "7", r: "4" }]],
  'settings': [['path', { d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" }], ['circle', { cx: "12", cy: "12", r: "3" }]],
  'user-round': [['circle', { cx: "12", cy: "8", r: "5" }], ['path', { d: "M20 21a8 8 0 0 0-16 0" }]],
  'file-pen-line': [['path', { d: "M14.364 13.634a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506l4.013-4.009a1 1 0 0 0-3.004-3.004z" }], ['path', { d: "M14.487 7.858A1 1 0 0 1 14 7V2" }], ['path', { d: "M20 19.645V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l2.516 2.516" }], ['path', { d: "M8 18h1" }]],
  'calendar-days': [['path', { d: "M8 2v4" }], ['path', { d: "M16 2v4" }], ['rect', { width: "18", height: "18", x: "3", y: "4", rx: "2" }], ['path', { d: "M3 10h18" }], ['path', { d: "M8 14h.01" }], ['path', { d: "M12 14h.01" }], ['path', { d: "M16 14h.01" }], ['path', { d: "M8 18h.01" }], ['path', { d: "M12 18h.01" }], ['path', { d: "M16 18h.01" }]],
  'folder-open': [['path', { d: "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" }]],
  'book-open': [['path', { d: "M12 7v14" }], ['path', { d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" }]],
  'package': [['path', { d: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" }], ['path', { d: "M12 22V12" }], ['polyline', { points: "3.29 7 12 12 20.71 7" }], ['path', { d: "m7.5 4.27 9 5.15" }]],
  'trash-2': [['path', { d: "M10 11v6" }], ['path', { d: "M14 11v6" }], ['path', { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }], ['path', { d: "M3 6h18" }], ['path', { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }]],
  'image': [['rect', { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }], ['circle', { cx: "9", cy: "9", r: "2" }], ['path', { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }]],
  'scale': [['path', { d: "M12 3v18" }], ['path', { d: "m19 8 3 8a5 5 0 0 1-6 0zV7" }], ['path', { d: "M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1" }], ['path', { d: "m5 8 3 8a5 5 0 0 1-6 0zV7" }], ['path', { d: "M7 21h10" }]],
  'pen-line': [['path', { d: "M13 21h8" }], ['path', { d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" }]],
  'graduation-cap': [['path', { d: "M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" }], ['path', { d: "M22 10v6" }], ['path', { d: "M6 12.5V16a6 3 0 0 0 12 0v-3.5" }]],
  'plug': [['path', { d: "M12 22v-5" }], ['path', { d: "M15 8V2" }], ['path', { d: "M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z" }], ['path', { d: "M9 8V2" }]],
  'info': [['circle', { cx: "12", cy: "12", r: "10" }], ['path', { d: "M12 16v-4" }], ['path', { d: "M12 8h.01" }]],
  'plus': [['path', { d: "M5 12h14" }], ['path', { d: "M12 5v14" }]],
  'folder': [['path', { d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" }]],
  'printer': [['path', { d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }], ['path', { d: "M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" }], ['rect', { x: "6", y: "14", width: "12", height: "8", rx: "1" }]],
  'file-down': [['path', { d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" }], ['path', { d: "M14 2v5a1 1 0 0 0 1 1h5" }], ['path', { d: "M12 18v-6" }], ['path', { d: "m9 15 3 3 3-3" }]],
  'check': [['path', { d: "M20 6 9 17l-5-5" }]],
  'x': [['path', { d: "M18 6 6 18" }], ['path', { d: "m6 6 12 12" }]],
  'circle-alert': [['circle', { cx: "12", cy: "12", r: "10" }], ['line', { x1: "12", x2: "12", y1: "8", y2: "12" }], ['line', { x1: "12", x2: "12.01", y1: "16", y2: "16" }]],
  'triangle-alert': [['path', { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" }], ['path', { d: "M12 9v4" }], ['path', { d: "M12 17h.01" }]],
  'circle-check': [['circle', { cx: "12", cy: "12", r: "10" }], ['path', { d: "m9 12 2 2 4-4" }]],
  'circle-help': [['circle', { cx: "12", cy: "12", r: "10" }], ['path', { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" }], ['path', { d: "M12 17h.01" }]],
  'refresh-cw': [['path', { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }], ['path', { d: "M21 3v5h-5" }], ['path', { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }], ['path', { d: "M8 16H3v5" }]],
  'chevron-down': [['path', { d: "m6 9 6 6 6-6" }]],
  'chevron-right': [['path', { d: "m9 18 6-6-6-6" }]],
  'loader-circle': [['path', { d: "M21 12a9 9 0 1 1-6.219-8.56" }]],
} as const satisfies Record<string, readonly Node[]>;

export function Icon({ name, size = '1em', ...rest }: {
  name: IconName;
  /** `1em` beside text; `20` in the rail. */
  size?: number | string;
} & Omit<SVGProps<SVGSVGElement>, 'name' | 'width' | 'height' | 'children'>) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
      data-icon={name}
      {...rest}
    >
      {NODES[name].map(([tag, attrs], i) => {
        const Tag = tag;
        return <Tag key={i} {...attrs} />;
      })}
    </svg>
  );
}
