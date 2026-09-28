import { useMemo, useState } from 'react';
import { Download, TrendingUp, Zap } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import type { PortalProps } from '../lib/portal';
import { money, date } from '../lib/format';
import { pageVariants, staggerContainer, fadeUp, scaleIn } from '../lib/animations';
import ProductionChart from '../components/ProductionChart';
import MinerVisual from '../components/MinerVisual';
import MinerStatement from '../components/MinerStatement';

export default function EarningsPage({ data }: PortalProps) {
  const [params] = useSearchParams();
  const [period, setPeriod] = useState(7);
  const [sharing, setSharing] = useState(false);
  const entries = useMemo(() => data.ledger.filter(e => e.wallet === 'earnings'), [data.ledger]);
  const history = data.dashboard.productionHistory;
  const totals = [1, 7, 30].map(days => ({ days, cents: history.slice(-days).reduce((sum, p) => sum + p.miningCents + p.sharingCents, 0) }));
  const exportCsv = () => {
    const rows = [['Data', 'Origem', 'Valor USD', 'Status', 'Referência'], ...entries.map(e => [e.createdAt, e.description, (e.amountCents / 100).toFixed(2), e.status, e.reference])];
    const csv = '\uFEFF' + rows.map(row => row.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = 'AMNG-rendimentos.csv'; a.click(); URL.revokeObjectURL(url);
  };
  const selected = data.miners.find(miner => miner.id === params.get('miner'));
  if (selected) return <MinerStatement data={data} miner={selected} />;

  return (
    <motion.div
      className="earnings-page"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="page-heading" variants={fadeUp}>
        <div>
          <p className="eyebrow">MINING STATEMENT</p>
          <h1>Rendimentos<span className="heading-dot">.</span></h1>
          <p>Da produção ao crédito. Seu resultado, com registro de origem.</p>
        </div>
        <button className="button button-secondary" onClick={exportCsv}>
          <Download size={16} />Exportar extrato
        </button>
      </motion.div>

      <motion.div className="earnings-kpis" variants={staggerContainer(0.06)}>
        {totals.map(t => (
          <motion.div className="panel" key={t.days} variants={scaleIn}>
            <span><TrendingUp size={15} />{t.days === 1 ? 'Último dia registrado' : t.days + ' dias'}</span>
            <strong>{money(t.cents)}</strong>
            <small>Créditos confirmados</small>
          </motion.div>
        ))}
      </motion.div>

      <motion.div className="earnings-layout" variants={staggerContainer(0.08)}>
        <motion.section className="panel earnings-chart" variants={fadeUp}>
          <header className="panel-header">
            <div>
              <p className="eyebrow">SEU HISTÓRICO</p>
              <h2>Produção diária</h2>
            </div>
            <select aria-label="Período" value={period} onChange={e => setPeriod(Number(e.target.value))}>
              <option value={7}>7 dias</option>
              <option value={14}>14 dias</option>
              <option value={30}>30 dias</option>
            </select>
          </header>
          <div className="segmented-control">
            <button className={!sharing ? 'active' : ''} aria-pressed={!sharing} onClick={() => setSharing(false)}>
              Mining Income
            </button>
            <button className={sharing ? 'active' : ''} aria-pressed={sharing} onClick={() => setSharing(true)}>
              Profit Sharing
            </button>
          </div>
          <ProductionChart points={history.slice(-period)} sharing={sharing} />
          <p className="chart-note">
            {data.mode === 'demo' ? 'Dados ilustrativos de sua demonstração isolada.' : 'Valores da conta, registrados no ledger.'}
          </p>
        </motion.section>

        <motion.section className="panel earnings-miners" variants={fadeUp}>
          <header className="panel-header">
            <h2>Produção por máquina</h2>
            <Zap size={18} />
          </header>
          {data.miners.map(m => (
            <Link key={m.id} to={'/app/earnings?miner=' + m.id}>
              <MinerVisual planId={m.planId} active={m.status === 'MINING'} variant="compact" />
              <div>
                <strong>{m.machine}</strong>
                <small>{m.coin} · {m.planName}</small>
              </div>
              <b>{money(m.totalEarnedCents)}</b>
            </Link>
          ))}
          {!data.miners.length && (
            <div className="empty-state">
              <p>Sem produção registrada.</p>
              <Link to="/app/plans">Explorar planos</Link>
            </div>
          )}
          <div className="earnings-total">
            <span>Total Mining Income</span>
            <strong>{money(data.dashboard.totalMiningCents)}</strong>
          </div>
        </motion.section>
      </motion.div>

      <motion.section className="panel" variants={fadeUp}>
        <header className="panel-header">
          <h2>Extrato de rendimentos</h2>
          <span className="badge">USD</span>
        </header>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Referência</th>
                <th>Status</th>
                <th className="align-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}>
                  <td>{date(e.createdAt)}</td>
                  <td>{e.description}</td>
                  <td className="mono">{e.reference.slice(-12)}</td>
                  <td><span className="badge">{e.status === 'CONFIRMED' ? 'Confirmado' : e.status}</span></td>
                  <td className={'align-right ' + (e.amountCents > 0 ? 'text-mint' : '')}>
                    {e.amountCents > 0 ? '+' : ''}{money(e.amountCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!entries.length && (
            <div className="empty-state">
              <p>Nenhum rendimento registrado.</p>
            </div>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}
