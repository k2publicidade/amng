import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, Clock3, Download, LoaderCircle, RotateCw, Zap } from 'lucide-react';
import type { BootstrapData, Miner, MinerStatementData } from '../../shared/types';
import { api } from '../lib/api';
import { money, number, percent } from '../lib/format';
import { minerStatusLabel } from '../lib/mining';
import MinerVisual from './MinerVisual';
import ProductionChart from './ProductionChart';
import './statement.css';

const dateUtc = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
const shortDateUtc = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(value));

export default function MinerStatement({ data, miner }: { data: BootstrapData; miner: Miner }) {
  const [period, setPeriod] = useState(7);
  const [sharing, setSharing] = useState(false);
  const [page, setPage] = useState(1);
  const [statement, setStatement] = useState<MinerStatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true); setError(null); setStatement(null);
    api<MinerStatementData>('/miners/' + encodeURIComponent(miner.id) + '/statement?days=' + period + '&page=' + page, { signal: controller.signal })
      .then(result => { if (active) setStatement(result); })
      .catch(cause => { if (active && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o extrato.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [miner.id, miner.totalEarnedCents, data.dashboard.profitSharingCents, data.user?.id, period, page, attempt]);
  const current = statement?.minerId === miner.id && statement.period.days === period ? statement : null;
  const exportCsv = () => {
    if (!current) return;
    const rows = [['Data UTC', 'Mining Income USD', 'Profit Sharing USD', 'Total USD', 'Contrato', 'Ambiente'], ...current.productionHistory.map(point => [point.date, (point.miningCents / 100).toFixed(2), (point.sharingCents / 100).toFixed(2), ((point.miningCents + point.sharingCents) / 100).toFixed(2), miner.id, current.isDemo ? 'Demonstração' : 'Conta real'])];
    const csv = '\uFEFF' + rows.map(row => row.map(value => '"' + String(value).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = 'AMNG-diario-' + miner.coin + '-' + period + 'dias.csv'; link.click(); URL.revokeObjectURL(url);
  };
  return <div className="earnings-page miner-statement">
    <div className="page-heading"><div><Link className="statement-back" to="/app/earnings"><ArrowLeft size={16} />Rendimentos</Link><p className="eyebrow">MINING STATEMENT</p><h1>Extrato da máquina<span className="heading-dot">.</span></h1><p>Contrato #{miner.id.slice(-8).toUpperCase()}</p></div><button className="button button-secondary" onClick={exportCsv} disabled={loading || !current || !!error} title="Resumo diário completo do período selecionado"><Download size={16} />Exportar resumo diário</button></div>
    <section className="panel statement-machine"><MinerVisual planId={miner.planId} active={miner.status === 'MINING'} variant="card" /><div><span className={'badge ' + (miner.status === 'MINING' ? 'badge-green' : miner.status === 'PAUSED' ? 'badge-warning' : '')}><i className="status-dot" />{minerStatusLabel(miner.status)}</span><h2>{miner.machine}</h2><p>{miner.coin} · {miner.planName}</p><dl><div><dt>Taxa do contrato</dt><dd>{percent(miner.rateBps)} / ciclo</dd></div><div><dt>Produção registrada</dt><dd className="text-mint">{money(miner.totalEarnedCents)}</dd></div><div><dt>Ciclos concluídos</dt><dd>{number(miner.cycleCount)}</dd></div></dl><Link to={'/app/miners?miner=' + miner.id}>Controle da máquina <ArrowUpRight size={13} /></Link></div></section>
    <div className="earnings-layout" aria-busy={loading}><section className="panel earnings-chart"><header className="panel-header"><h2>Produção diária</h2><select aria-label="Período do extrato" value={period} onChange={event => { setPeriod(Number(event.target.value)); setPage(1); }}><option value={7}>7 dias</option><option value={14}>14 dias</option><option value={30}>30 dias</option></select></header><div className="segmented-control"><button className={!sharing ? 'active' : ''} aria-pressed={!sharing} onClick={() => setSharing(false)}>Mining Income</button><button className={sharing ? 'active' : ''} aria-pressed={sharing} onClick={() => setSharing(true)}>Profit Sharing</button></div>{loading ? <div className="statement-query-state" role="status"><LoaderCircle className="statement-spin" size={20} /><p>Carregando créditos do período…</p></div> : error ? <div className="statement-query-state" role="alert"><p>{error}</p><button className="button button-secondary" onClick={() => setAttempt(value => value + 1)}><RotateCw size={15} />Tentar novamente</button></div> : current && <><ProductionChart points={current.productionHistory} sharing={sharing} /><p className="chart-note">{current.isDemo ? 'Créditos simulados de sua demonstração.' : 'Apenas créditos confirmados deste contrato.'} Dias apurados em UTC.</p></>}</section><section className="panel statement-breakdown"><header className="panel-header"><div><p className="eyebrow">COMPOSIÇÃO / {period} DIAS</p><h2>Créditos do período</h2></div><Zap size={18} /></header><div><span>Mining Income</span><strong>{current ? money(current.totals.miningCents) : '—'}</strong></div><div><span>Profit Sharing</span><strong>{current ? money(current.totals.sharingCents) : '—'}</strong></div><div className="statement-total"><span>{miner.isDemo ? 'Total simulado' : 'Total confirmado'}</span><strong>{current ? money(current.totals.totalCents) : '—'}</strong></div><p><Clock3 size={14} />Mining Income é registrado ao concluir o ciclo de 24h.</p></section></div>
    {current && !loading && !error && <section className="panel"><header className="panel-header"><h2>Movimentações da máquina</h2><span className="badge">USD · UTC</span></header><p className="statement-period">{shortDateUtc(current.productionHistory[0].date)} – {shortDateUtc(current.productionHistory[current.productionHistory.length - 1].date)} · {current.isDemo ? 'Demonstração' : 'Créditos confirmados'}</p><div className="table-wrap"><table className="data-table"><thead><tr><th>Data</th><th>Origem</th><th>Status</th><th className="align-right">Valor</th></tr></thead><tbody>{current.ledger.map(entry => <tr key={entry.id}><td>{dateUtc(entry.createdAt)}</td><td>{entry.kind === 'MINING_INCOME' ? 'Mining Income' : 'Profit Sharing'}</td><td><span className="badge badge-green">{entry.isDemo ? 'Simulado' : 'Confirmado'}</span></td><td className="align-right text-mint">{entry.amountCents >= 0 ? '+' : ''}{money(entry.amountCents)}</td></tr>)}</tbody></table>{!current.ledger.length && <div className="empty-state"><p>Nenhum crédito registrado neste contrato no período selecionado.</p></div>}</div>{current.pagination.totalEntries > 0 && <footer className="statement-pagination"><span>{current.pagination.page} / {current.pagination.totalPages} · {number(current.pagination.totalEntries)} registros no período</span><div><button className="icon-button" aria-label="Página anterior" disabled={current.pagination.page === 1} onClick={() => setPage(current.pagination.page - 1)}><ChevronLeft size={17} /></button><button className="icon-button" aria-label="Próxima página" disabled={current.pagination.page === current.pagination.totalPages} onClick={() => setPage(current.pagination.page + 1)}><ChevronRight size={17} /></button></div></footer>}</section>}
  </div>;
}

