import type { Lint } from '../mlog/validator';

export default function LintList({ lints }: { lints: Lint[] }) {
  if (lints.length === 0) {
    return <div className="lint" style={{ borderLeftColor: 'var(--ok)' }}>
      <span className="sev" style={{ color: 'var(--ok)' }}>OK</span>
      <span>No problems found — this code should paste and run cleanly.</span>
    </div>;
  }
  return (
    <div>
      {lints.map((lint, i) => (
        <div key={i} className={`lint ${lint.severity}`}>
          <span className="line">L{lint.line}</span>
          <span className="sev">{lint.severity}</span>
          <span>{lint.message}</span>
        </div>
      ))}
    </div>
  );
}
