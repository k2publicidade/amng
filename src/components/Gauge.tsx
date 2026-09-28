import { useId, type ReactNode } from 'react';

export default function Gauge({ value, total = 100, children, color = 'var(--blue)', className = '' }: { value: number; total?: number; children: ReactNode; color?: string; className?: string }) {
  const id = useId().replace(/:/g, '');
  const ratio = Math.max(0, Math.min(1, value / Math.max(1, total)));
  return <div className={'gauge ' + className} style={{ '--gauge-color': color } as React.CSSProperties}>
    <svg viewBox="0 0 120 120" aria-hidden="true"><defs><filter id={'gauge-' + id}><feGaussianBlur stdDeviation="1.7" /></filter></defs><circle className="gauge-track" cx="60" cy="60" r="52" /><circle className="gauge-ticks" cx="60" cy="60" r="46" /><circle className="gauge-glow" cx="60" cy="60" r="52" pathLength="100" strokeDasharray={`${ratio * 100} 100`} filter={`url(#gauge-${id})`} /><circle className="gauge-progress" cx="60" cy="60" r="52" pathLength="100" strokeDasharray={`${ratio * 100} 100`} /></svg>
    <div className="gauge-content">{children}</div>
  </div>;
}
