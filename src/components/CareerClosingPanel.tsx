import { useEffect, useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { CareerPreview } from '../../shared/types';
import { api } from '../lib/api';
import { money } from '../lib/format';

const lastClosedMonth = () => { const value = new Date(); value.setUTCDate(1); value.setUTCMonth(value.getUTCMonth() - 1); return value.toISOString().slice(0, 7); };

export default function CareerClosingPanel({ isDemo, busy, onClose }: { isDemo: boolean; busy: boolean; onClose: (month: string) => Promise<boolean> }) {
  const [month, setMonth] = useState(lastClosedMonth);
  const [preview, setPreview] = useState<CareerPreview | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setPreview(null); setError('');
    api<CareerPreview>('/admin/career/preview?month=' + encodeURIComponent(month)).then(value => { if (!cancelled) setPreview(value); }).catch(failure => { if (!cancelled) setError((failure as Error).message); });
    return () => { cancelled = true; };
  }, [month, revision]);
  const submit = async (event: FormEvent) => { event.preventDefault(); if (preview?.canClose && await onClose(month)) setRevision(value => value + 1); };
  return <section className="panel admin-career-panel">
    <form className="admin-career-close" onSubmit={submit}><div><p className="eyebrow">PULSO + POTÊNCIA</p><h2>Fechamento mensal da carreira</h2><p className="form-hint">Apuração da competência, qualificação e manutenção, com salários e bônus dentro do orçamento disponível.</p></div><label className="field">Competência encerrada (UTC)<input name="month" type="month" max={lastClosedMonth()} value={month} onChange={event => setMonth(event.target.value)} required /></label><button className="button button-primary" disabled={busy || !isDemo || !preview?.canClose}>{preview?.closed ? 'Fechamento registrado' : 'Registrar fechamento'}<ShieldCheck size={15} /></button></form>
    {error && <p className="form-error" role="alert">{error}</p>}
    {!preview && !error && <p className="form-hint">Consultando orçamento da competência...</p>}
    {preview && <><div className="admin-career-budget"><div><span>Salários · disponível</span><strong>{money(preview.salary.availableCents)}</strong><small>Financiado {money(preview.salary.fundedCents)} · pago {money(preview.salary.paidCents)}</small></div><div><span>Bônus · disponível</span><strong>{money(preview.bonus.availableCents)}</strong><small>Financiado {money(preview.bonus.fundedCents)} · pago {money(preview.bonus.paidCents)}</small></div><div><span>Reserva da competência</span><strong>{money(preview.reserve.availableCents)}</strong><small>{preview.users} participantes no escopo</small></div></div><div className="admin-career-estimate"><span>{preview.closed ? 'Salários apurados' : 'Previsão de salários'}<strong>{money(preview.predictedSalaryCents)}</strong></span><span>Diferença para financiar<strong>{money(preview.salaryGapCents)}</strong></span><span>Compromissos aguardando funding<strong>{money(preview.awaitingCents)}</strong></span></div><p className="form-hint">{isDemo ? 'Simulação isolada. ' : 'Regras reais aguardam aprovação. '}{!preview.closed && 'Bônus são apurados no fechamento. '}{preview.nextMonth !== month && 'Próxima competência na sequência: ' + preview.nextMonth + '.'}</p></>}
  </section>;
}
