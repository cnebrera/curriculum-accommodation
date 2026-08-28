export function Notice({ kind, title, children }: {
  kind: 'info' | 'warn' | 'danger';
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`notice ${kind}`} role={kind === 'danger' ? 'alert' : 'status'}>
      {title ? <strong>{title}</strong> : null}
      <div>{children}</div>
    </div>
  );
}
