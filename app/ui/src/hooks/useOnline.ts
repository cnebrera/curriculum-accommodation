import { useEffect, useState } from 'react';

/**
 * Everything except adaptation works offline (006 FR-424): reading notes,
 * editing profiles, reprinting. Losing the network must not look like losing
 * the tool.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true), down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return online;
}
