import { useId, useMemo, useState } from 'react';
import { money, shortDate } from '../lib/format';

export default function ProductionChart({ points, sharing = false }: { points: { date: string; miningCents: number; sharingCents: number }[]; sharing?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const chartId = useId().replace(/:/g, '');
  const chart = useMemo(() => {
    const values = points.map(p => sharing ? p.sharingCents : p.miningCents);
    const max = Math.max(...values, 1) * 1.15;
    const coords = values.map((value, i) => ({ x: 12 + (i / Math.max(values.length - 1, 1)) * 476, y: 160 - (value / max) * 125 }));
    const path = coords.map((p, i) => (i ? 'L' : 'M') + p.x + ',' + p.y).join(' ');
    return { coords, path, area: path + ' L488,176 L12,176 Z', max };
  }, [points, sharing]);
  if (!points.length) return <div className="chart-empty"><span>Sem produção registrada</span><p>O histórico aparece após seus primeiros ciclos.</p></div>;
  const idx = Math.min(points.length - 1, hover ?? points.length - 1);
  return <div className="production-chart" tabIndex={0} role="group" aria-label="Gráfico de produção. Use as setas para consultar os dias." onMouseLeave={() => setHover(null)} onKeyDown={event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    setHover(event.key === 'Home' ? 0 : event.key === 'End' ? points.length - 1 : Math.max(0, Math.min(points.length - 1, idx + (event.key === 'ArrowRight' ? 1 : -1))));
  }}>
    <div className="chart-value"><strong>{money(sharing ? points[idx].sharingCents : points[idx].miningCents)}</strong><span>{shortDate(points[idx].date)}</span></div>
    <svg viewBox="0 0 500 190" role="img" aria-label={'Histórico de ' + (sharing ? 'Profit Sharing' : 'Mining Income')} onMouseMove={(event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      setHover(Math.min(points.length - 1, Math.max(0, Math.round((event.clientX - rect.left) / rect.width * (points.length - 1)))));
    }}>
      <desc>{points.map(p => shortDate(p.date) + ': ' + money(sharing ? p.sharingCents : p.miningCents)).join('. ')}</desc>
      <defs><linearGradient id={'chart-fill-' + chartId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--mint)" stopOpacity=".25" /><stop offset="100%" stopColor="var(--mint)" stopOpacity="0" /></linearGradient></defs>
      {[40, 85, 130, 175].map(y => <line key={y} x1="12" x2="488" y1={y} y2={y} className="chart-grid" />)}
      <path d={chart.area} fill={'url(#chart-fill-' + chartId + ')'} />
      <path d={chart.path} fill="none" stroke="var(--mint)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {hover !== null && <><line x1={chart.coords[idx].x} x2={chart.coords[idx].x} y1="16" y2="175" stroke="var(--mint)" strokeOpacity=".25" strokeDasharray="4 4" /><circle cx={chart.coords[idx].x} cy={chart.coords[idx].y} r="5" fill="var(--mint)" stroke="var(--panel)" strokeWidth="3" /></>}
    </svg>
    <div className="chart-axis"><span>{shortDate(points[0].date)}</span><span>{shortDate(points[Math.floor(points.length / 2)].date)}</span><span>{shortDate(points[points.length - 1].date)}</span></div>
  </div>;
}
