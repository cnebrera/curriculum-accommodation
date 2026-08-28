import { useEffect, useState } from 'react';

/** In cents, never tokens (006 FR-422). */
export function CostBadge() {
  const [text, setText] = useState<string>('');
  useEffect(() => {
    void window.rampa.cost.month().then((c: { formatted: string; jobs: number }) => {
      setText(c.jobs === 0 ? '' : `Este mes: ${c.formatted}`);
    }).catch(() => setText(''));
  }, []);
  if (!text) return null;
  return <span className="badge" title="Lo que llevas gastado este mes en tu propia cuenta de IA">{text}</span>;
}
