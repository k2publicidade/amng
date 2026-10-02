import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowDownLeft, ArrowDownToLine, ArrowRight, ArrowUpRight, ChevronRight, Cpu, GitBranch, Power, ShieldCheck, TrendingUp, Wallet, Zap } from 'lucide-react';
import type { PortalProps } from '../lib/portal';
import { minerAccent } from '../../shared/miner-theme';
import { useMinerActivation } from '../lib/useMinerActivation';
import { money, number, shortDate } from '../lib/format';
import { countdown, cycleClock, elapsedRatio, minerStatusLabel, useMiningClock } from '../lib/mining';
import { pageVariants, staggerContainer, fadeUp, scaleIn } from '../lib/animations';
import MinerVisual from '../components/MinerVisual';
import Gauge from '../components/Gauge';
import ProductionChart from '../components/ProductionChart';
import QuoteBar from '../components/QuoteBar';
import IgnitionStatus from '../components/IgnitionStatus';

const MotionLink = motion.create(Link);

export default function DashboardPage({ data, refresh, notify }: PortalProps) {
  const [selected, setSelected] = useState(data.miners.find(m => m.status === 'MINING')?.id ?? data.miners[0]?.id);
  const ignition = useMinerActivation({ refresh, notify });
  const [period, setPeriod] = useState(7);
  const now = useMiningClock();
  const miner = data.miners.find(m => m.id === selected) ?? data.miners[0];
  const active = data.miners.filter(m => m.status === 'MINING').length;
  const ready = data.miners.filter(m => m.status === 'READY').length;
  const paused = data.miners.filter(m => m.status === 'PAUSED').length;
  const total = data.wallets.reduce((s, w) => s + w.balanceCents, 0);
  const points = data.dashboard.productionHistory.slice(-period);

  return (
    <motion.div
      className="dashboard-page"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="page-heading" variants={fadeUp}>
        <div>
          <p className="eyebrow">SUA CENTRAL DE MINERAÇÃO</p>
          <h1>Visão geral<span className="heading-dot">.</span></h1>
          <p>Olá, {data.user?.name.split(' ')[0]}. Acompanhe cada movimento da sua operação.</p>
        </div>
        <Link className="button button-secondary desktop-only" to="/app/plans">
          Expandir operação <ArrowUpRight size={16} />
        </Link>
      </motion.div>

      <motion.section className="operation-brief" variants={fadeUp} aria-label="Resumo e próxima ação da operação">
        <div className="operation-brief-title"><Cpu size={20} /><div><span className="eyebrow">CONTROLE DA OPERAÇÃO</span><strong>{active} {active === 1 ? 'máquina em ciclo' : 'máquinas em ciclo'}<span> / {data.miners.length} contratadas</span></strong></div></div>
        <div className="operation-brief-next"><p>{ready ? `${ready} ${ready === 1 ? 'máquina pronta para ativar' : 'máquinas prontas para ativar'}.` : paused ? `${paused} ${paused === 1 ? 'ciclo pausado' : 'ciclos pausados'}. Retome quando estiver pronto.` : data.miners.length ? 'Acompanhe seus ciclos e os créditos registrados.' : 'Conheça os modelos e escolha seu primeiro plano.'}</p><Link to={data.miners.length ? '/app/miners' : '/app/plans'}>{ready ? 'Ativar máquinas' : paused ? 'Retomar ciclos' : data.miners.length ? 'Gerenciar frota' : 'Explorar planos'} <ArrowRight size={15} /></Link></div>
      </motion.section>

      <motion.section className="mobile-overview panel" aria-label="Saldo total" variants={fadeUp}>
        <div className="balance-title">SALDO TOTAL <Wallet size={13} /></div>
        <div className="mobile-balance-line">
          <strong>{money(total)}</strong>
          <span><TrendingUp size={12} />{money(data.dashboard.todayMiningCents)}<small>Produção hoje</small></span>
        </div>
        <div className="mobile-balance-actions">
          <Link className="button button-primary" to="/app/wallets?tab=deposit"><ArrowDownToLine size={15} />Depositar</Link>
          <Link className="button button-secondary" to="/app/wallets?tab=withdraw">Sacar <ArrowUpRight size={15} /></Link>
        </div>
      </motion.section>

      <motion.div className="wallet-summary" variants={staggerContainer(0.07)}>
        {data.wallets.map((wallet, i) => (
          <MotionLink
            key={wallet.id}
            to={'/app/wallets?wallet=' + wallet.id}
            className={'wallet-summary-item wallet-' + wallet.id}
            variants={scaleIn}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
          >
            <div>
              <span className="wallet-mini-icon">{i === 0 ? <Wallet size={18} /> : i === 1 ? <Zap size={18} /> : <GitBranch size={18} />}</span>
              <span>{wallet.label}</span>
              <ArrowUpRight size={14} />
            </div>
            <strong>{money(wallet.balanceCents)}</strong>
            <p>
              {wallet.reservedCents > 0
                ? money(wallet.availableCents) + ' disponível · ' + money(wallet.reservedCents) + ' reservado'
                : i === 0
                  ? 'Disponível para sua operação'
                  : i === 1
                    ? 'Mining Income + Profit Sharing'
                    : 'Resultados da sua rede'}
              <span>USD</span>
            </p>
          </MotionLink>
        ))}
      </motion.div>

      <motion.div className="dashboard-grid" variants={staggerContainer(0.08)}>
        <motion.section className="operation-panel panel" variants={fadeUp} style={{ '--miner-accent': miner ? minerAccent(miner.planId) : undefined } as CSSProperties}>
          <header className="panel-header">
            <div>
              <p className="eyebrow">MINING CONTROL</p>
              <h2>Sua operação<span className="tiny-index">/ {String(data.miners.length).padStart(2, '0')}</span></h2>
            </div>
            <span className={'badge ' + (active ? 'badge-green' : '')}><i className="status-dot" />{active} EM CICLO</span>
          </header>
          {miner ? (
            <>
              <div className="operation-model">
                <div>
                  <h3>{miner.machine}</h3>
                  <p>{miner.coin} <span>·</span> CLOUD MINING <span>·</span> #{miner.id.slice(-6).toUpperCase()}</p>
                </div>
                <Link aria-label="Abrir detalhes da máquina" to={'/app/miners?miner=' + miner.id}><ArrowUpRight size={20} /></Link>
              </div>
              <div className={'operation-stage ' + (miner.status === 'MINING' ? 'is-mining' : '') + (miner.status === 'PAUSED' ? 'is-paused' : '') + (ignition.startingId === miner.id ? ' is-starting' : '')}>
                <div className="machine-halo" aria-hidden="true">
                  <svg viewBox="0 0 350 350">
                    <circle cx="175" cy="175" r="145" />
                    <circle cx="175" cy="175" r="145" className="halo-progress" pathLength="100" style={{ strokeDasharray: `${elapsedRatio(miner, now) * 100} 100` }} />
                  </svg>
                </div>
                <MinerVisual planId={miner.planId} active={miner.status === 'MINING'} starting={ignition.startingId === miner.id} variant="hero" />
                <span className="machine-stage-label">
                  {ignition.startingId === miner.id
                    ? 'INICIALIZANDO'
                    : miner.status === 'MINING'
                      ? 'CICLO ATIVO'
                      : miner.status === 'PAUSED'
                        ? 'PAUSADA · MÁQUINA DESLIGADA'
                        : 'AGUARDANDO ATIVAÇÃO'}
                  <span className="status-dot" />
                </span>
                {ignition.startingId === miner.id && <IgnitionStatus step={ignition.step} />}
              </div>
              <div className="operation-stat-strip">
                <div><small>Produção prevista / ciclo</small><strong>{money(miner.cycleEstimatedCents)}</strong></div>
                <div><small>{miner.status === 'PAUSED' ? 'Tempo congelado' : 'Próximo crédito'}</small><strong className="mono">{countdown(miner.cycleEndsAt, cycleClock(miner, now))}</strong></div>
                <div><small>Produção registrada</small><strong>{money(miner.totalEarnedCents)}</strong></div>
              </div>
              <div className="operation-footer">
                <div className="machine-selector">
                  {data.miners.slice(0, 5).map((m, i) => (
                    <button
                      key={m.id}
                      disabled={ignition.busy}
                      className={m.id === miner.id ? 'selected' : ''}
                      aria-label={'Selecionar ' + m.machine}
                      aria-pressed={m.id === miner.id}
                      onClick={() => setSelected(m.id)}
                    >
                      <span>{String(i + 1).padStart(2, '0')}</span>{m.coin}
                    </button>
                  ))}
                </div>
                <button
                  className={'button ' + (miner.status === 'MINING' ? 'button-active' : 'button-primary')}
                  disabled={ignition.busy || !['READY', 'MINING', 'PAUSED'].includes(miner.status)}
                  onClick={() => {
                    if (miner.status === 'READY') ignition.activate(miner);
                    else if (miner.status === 'MINING') ignition.pause(miner);
                    else if (miner.status === 'PAUSED') ignition.resume(miner);
                  }}
                >
                  <Power size={16} />
                  {ignition.requestingId === miner.id
                    ? ignition.action === 'pause' ? 'Pausando...' : ignition.action === 'resume' ? 'Religando...' : 'Confirmando...'
                    : ignition.startingId === miner.id
                      ? 'Inicializando...'
                      : miner.status === 'MINING'
                        ? 'Pausar ciclo'
                        : miner.status === 'PAUSED'
                          ? 'Religar máquina'
                          : miner.status === 'READY'
                            ? 'Ativar mineração'
                            : 'Contrato encerrado'}
                </button>
              </div>
              <p className="operation-note">{data.mode === 'demo' ? 'Ciclo demonstrativo de 24h. ' : ''}{miner.status === 'PAUSED' ? 'Máquina desligada: o tempo restante do ciclo fica congelado até religar. ' : ''}A imagem representa o modelo do plano. Telemetria física ainda não conectada.</p>
            </>
          ) : (
            <div className="operation-empty">
              <MinerVisual planId="alph" variant="hero" />
              <h3>Sua primeira máquina está aqui.</h3>
              <p>Explore os planos e escolha como começar.</p>
              <Link className="button button-primary" to="/app/plans">Conhecer planos <ArrowUpRight size={16} /></Link>
            </div>
          )}
        </motion.section>

        <motion.section className="production-panel panel" variants={fadeUp}>
          <header className="panel-header">
            <div>
              <p className="eyebrow">PRODUÇÃO CONFIRMADA</p>
              <h2>Rendimentos</h2>
            </div>
            <Link to="/app/earnings" aria-label="Ver rendimentos"><ArrowUpRight size={20} /></Link>
          </header>
          <div className="production-total">
            <strong>{money(data.dashboard.totalMiningCents)}</strong>
            <span><TrendingUp size={14} />Mining Income acumulado</span>
          </div>
          <div className="production-kpis">
            <div><span><i className="status-dot" />Hoje</span><strong>{money(data.dashboard.todayMiningCents)}</strong></div>
            <div><span>Profit Sharing</span><strong>{money(data.dashboard.profitSharingCents)}</strong></div>
          </div>
          <ProductionChart points={points} />
          <div className="chart-periods" aria-label="Período do gráfico">
            {[7, 14, 30].map(p => (
              <button key={p} className={period === p ? 'active' : ''} aria-pressed={period === p} onClick={() => setPeriod(p)}>
                {p} dias
              </button>
            ))}
            <Link to="/app/earnings">Ver extrato <ArrowRight size={13} /></Link>
          </div>
          <p className="chart-note">Créditos registrados, por dia. {data.mode === 'demo' && 'Histórico ilustrativo.'}</p>
        </motion.section>
      </motion.div>

      <motion.section className="mobile-fleet-section" variants={fadeUp}>
        <div className="section-heading">
          <h2>Minhas máquinas</h2>
          <Link to="/app/miners">Ver todas <ChevronRight size={13} /></Link>
        </div>
        <div className="mobile-fleet-list">
          {data.miners.map(m => (
            <Link key={m.id} to={'/app/miners?miner=' + m.id} className="mobile-fleet-row">
              <MinerVisual planId={m.planId} variant="compact" active={m.status === 'MINING'} />
              <div>
                <h3>{m.machine}</h3>
                <p>{m.coin} · Cloud Mining</p>
                <small>{m.allocatedHashrate === null ? 'Hashrate a conectar' : number(m.allocatedHashrate, 2) + ' ' + m.hashrateUnit}</small>
              </div>
              <div className="mobile-fleet-status">
                <span className={'badge ' + (m.status === 'MINING' ? 'badge-green' : m.status === 'PAUSED' ? 'badge-warning' : '')}>
                  <i className="status-dot" />{minerStatusLabel(m.status)}
                </span>
                <strong>{money(m.totalEarnedCents)}</strong>
                <small>Registrado</small>
              </div>
            </Link>
          ))}
          {!data.miners.length && <Link className="button button-primary" to="/app/plans">Explorar planos <ArrowUpRight size={16} /></Link>}
        </div>
      </motion.section>

      <motion.div className="dashboard-secondary-grid" variants={staggerContainer(0.08)}>
        <motion.section className="ledger-panel panel" variants={fadeUp}>
          <header className="panel-header">
            <div>
              <p className="eyebrow">CADA MOVIMENTO CONTA</p>
              <h2>Últimas movimentações</h2>
            </div>
            <Link to="/app/wallets">Ver extrato <ArrowUpRight size={15} /></Link>
          </header>
          <div className="recent-ledger">
            {data.ledger.slice(0, 5).map(entry => (
              <div key={entry.id}>
                <span className={'ledger-icon ' + (entry.amountCents > 0 ? 'positive' : '')}>
                  {entry.amountCents > 0 ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </span>
                <div>
                  <strong>{entry.description}</strong>
                  <small>{shortDate(entry.createdAt)} <span>·</span> {entry.wallet === 'deposit' ? 'Depósitos' : entry.wallet === 'earnings' ? 'Rendimentos' : 'Afiliados'}</small>
                </div>
                <span className="ledger-amount">
                  <strong className={entry.amountCents > 0 ? 'text-mint' : ''}>{entry.amountCents > 0 ? '+' : ''}{money(entry.amountCents)}</strong>
                  <small>{entry.status === 'CONFIRMED' ? 'Confirmado' : entry.status === 'RESERVED' ? 'Reservado' : entry.status === 'REVERSED' ? 'Compensado' : 'Pendente'}</small>
                </span>
              </div>
            ))}
            {!data.ledger.length && (
              <div className="empty-state">
                <Wallet size={26} />
                <p>Sua movimentação aparecerá aqui.</p>
              </div>
            )}
          </div>
        </motion.section>

        <motion.section className="career-preview panel" variants={fadeUp}>
          <header className="panel-header">
            <div>
              <p className="eyebrow">PULSO + POTÊNCIA</p>
              <h2>Sua próxima conquista</h2>
            </div>
            <ShieldCheck size={20} />
          </header>
          <div className="career-preview-content">
            <Gauge value={data.career.pulse} color="var(--mint)">
              <strong>{number(data.career.pulse, 1)}</strong>
              <small>PULSO / 100</small>
            </Gauge>
            <div>
              <span className="eyebrow">PRÓXIMO ESTÁGIO</span>
              <h3>{data.career.nextStage}</h3>
              <p><Zap size={14} />{number(data.career.power)} <span>/ {data.career.nextPower} potência</span></p>
              <small>{data.career.qualificationMonths} / 2 fechamentos qualificados</small>
            </div>
          </div>
          <div className="career-preview-footer">
            <span className="badge">Proposta em análise</span>
            <Link to="/app/career">Ver carreira <ArrowUpRight size={14} /></Link>
          </div>
        </motion.section>
      </motion.div>

      <motion.div variants={fadeUp}>
        <QuoteBar data={data} />
      </motion.div>
    </motion.div>
  );
}
