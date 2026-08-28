import type { ReactNode } from 'react';
import { Logo } from './Logo.js';

/**
 * An empty state is the first thing she sees, so it is designed (FR-828) — and
 * each one says what to do next. A blank panel leaves her stopped, which on the
 * first screen is indistinguishable from the tool not working.
 */
export function EmptyState({ title, children, action }: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty" role="status">
      <Logo size={52} tone="faint" />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
