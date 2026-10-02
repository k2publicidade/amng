import { lazy, Suspense, useEffect, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  Cpu,
  Info,
  Layers,
  Pause,
  Power,
  Radio,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { PortalProps } from '../lib/portal';
import type { Miner } from '../../shared/types';
import { minerAccent } from '../../shared/miner-theme';
import { useMinerActivation } from '../lib/useMinerActivation';
import { countdown, cycleClock, elapsedRatio, minerStatusLabel, useMiningClock } from '../lib/mining';
import { date, money, number, percent } from '../lib/format';
import { pageVariants, staggerContainer, fadeUp, scaleIn, dynamicEase } from '../lib/animations';
import MinerVisual from '../components/MinerVisual';
import Gauge from '../components/Gauge';
import IgnitionStatus from '../components/IgnitionStatus';
import './miners.css';

const QuantumReactorCanvas = lazy(() => import('../components/QuantumReactorCanvas'));

const statusClass = (status: Miner['status']) => status === 'MINING' ? 'status-mining' : status === 'PAUSED' ? 'status-paused' : status === 'READY' ? 'status-ready' : 'status-expired';

export default function MinersPage({ data, refresh, notify }: PortalProps) {
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState('ALL');
  const ignition = useMinerActivation({ refresh, notify });
  const [expanded, setExpanded] = useState(false);
  const now = useMiningClock();

  const selected = data.miners.find(m => m.id === params.get('miner'));

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [params.get('miner')]);

  const choose = (m: Miner) => {
    setParams({ miner: m.id });
    setExpanded(false);
  };

  const plan = data.plans.find(p => p.id === selected?.planId);
  const ratio = selected ? elapsedRatio(selected, now) : 0;

  // Fleet Telemetry KPIs. A paused machine keeps its contract and its allocated power.
  const activeMiningCount = data.miners.filter(m => m.status === 'MINING').length;
  const readyCount = data.miners.filter(m => m.status === 'READY').length;
  const pausedCount = data.miners.filter(m => m.status === 'PAUSED').length;
  const contractedStatuses: Miner['status'][] = ['READY', 'MINING', 'PAUSED'];
  const totalPowerWeight = data.miners.reduce((acc, m) => acc + (contractedStatuses.includes(m.status) ? m.powerWeight : 0), 0);
  const total24hEstimatedCents = data.miners.reduce(
    (acc, m) => acc + (contractedStatuses.includes(m.status) ? m.cycleEstimatedCents : 0),
    0
  );

  return (
    <motion.div
      className={`miners-page miners-cyber-page ${selected ? 'has-selection mobile-view-detail' : ''}`}
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 1. TOP TELEMETRY HUD */}
      <motion.section className="fleet-hud-deck" variants={fadeUp}>
        <div className="fleet-hud-header">
          <div className="fleet-hud-title-wrap">
            <span className="fleet-hud-badge-tag">
              <Zap size={11} /> CLOUD MINING / SUA OPERAÇÃO
            </span>
            <h1>
              Minhas Máquinas<span className="heading-dot">.</span>
            </h1>
            <p className="eyebrow" style={{ color: '#7e9db5', marginTop: 4 }}>
              Acompanhe suas máquinas e ative cada ciclo de 24 horas.
            </p>
          </div>
          <div className="fleet-hud-header-actions">
            <Link className="cyber-cta-btn" to="/app/plans">
              <Sparkles size={14} /> Explorar máquinas <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>

        {/* Global Fleet Telemetry Ribbon */}
        <div className="fleet-telemetry-ribbon" aria-label="Resumo dos contratos">
          <div className="telemetry-cell">
            <span className="telemetry-label">
              <span className="telemetry-indicator-pulse" />
              Ciclos ativos
            </span>
            <div className="telemetry-value">
              {activeMiningCount}
              <small>/ {data.miners.length} CONTRATOS{pausedCount ? ` · ${pausedCount} PAUSADA${pausedCount > 1 ? 'S' : ''}` : ''}</small>
            </div>
          </div>

          <div className="telemetry-cell">
            <span className="telemetry-label">
              <Layers size={11} />
              Prontas p/ Ativar
            </span>
            <div className="telemetry-value">
              {readyCount}
              <small>EM ESPERA</small>
            </div>
          </div>

          <div className="telemetry-cell">
            <span className="telemetry-label">
              <Activity size={11} />
              Rendimento 24h Estimado
            </span>
            <div className="telemetry-value" style={{ color: '#10b981' }}>
              {money(total24hEstimatedCents)}
              <small>POR CICLO</small>
            </div>
          </div>

          <div className="telemetry-cell">
            <span className="telemetry-label">
              <Radio size={11} />
              Potência Total da Frota
            </span>
            <div className="telemetry-value">
              {number(totalPowerWeight)}
              <small>PTS CLOUD</small>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 2. FLEET COCKPIT DUAL-PANE LAYOUT */}
      <div className="fleet-layout cyber-cockpit-grid">
        {/* LEFT COLUMN: FLEET MATRIX BROWSER */}
        <motion.section className="fleet-browser cyber-fleet-browser" variants={fadeUp}>
          <div className="segmented-control cyber-filter-matrix" aria-label="Filtrar máquinas">
            {[
              ['ALL', 'Todas'],
              ['MINING', 'Em Ciclo'],
              ['PAUSED', 'Pausadas'],
              ['READY', 'Prontas'],
            ].map(([id, label]) => {
              const count = data.miners.filter(m => id === 'ALL' || m.status === id).length;
              return (
                <button
                  key={id}
                  className={`cyber-filter-tab ${filter === id ? 'active' : ''}`}
                  aria-pressed={filter === id}
                  onClick={() => setFilter(id)}
                >
                  {label}
                  <small>{count}</small>
                </button>
              );
            })}
          </div>

          <motion.div className="fleet-cards cyber-cards-deck" variants={staggerContainer(0.06)}>
            {data.miners
              .filter(m => filter === 'ALL' || m.status === filter)
              .map((m, i) => {
                const isSelected = selected?.id === m.id;
                const minerRatio = elapsedRatio(m, now);
                return (
                  <motion.div
                    key={m.id}
                    className={`fleet-card cyber-miner-card ${isSelected ? 'selected' : ''}`}
                    style={{ '--miner-accent': minerAccent(m.planId) } as CSSProperties}
                    onClick={() => choose(m)}
                    variants={scaleIn}
                    whileHover={{ y: -5, scale: 1.015, transition: { duration: 0.22, ease: dynamicEase } }}
                    whileTap={{ scale: 0.98 }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        choose(m);
                      }
                    }}
                    aria-label={`Máquina ${m.machine} ${m.planName}`}
                  >
                    <header className="cyber-card-top">
                      <span className="cyber-card-rig-id">
                        RIG #{String(i + 1).padStart(2, '0')} // {m.coin}
                      </span>
                      <span className={`cyber-status-pill ${statusClass(m.status)}`}>
                        <i className="status-dot" />
                        {minerStatusLabel(m.status)}
                      </span>
                    </header>

                    <div className="cyber-card-visual-window">
                      <MinerVisual planId={m.planId} variant="card" active={m.status === 'MINING'} starting={ignition.startingId === m.id} />
                    </div>

                    <div className="cyber-card-body">
                      <div className="cyber-card-title-group">
                        <h3>{m.machine}</h3>
                        <div className="cyber-card-plan-meta">
                          <span>{m.planName}</span>
                          <ArrowUpRight size={14} />
                        </div>
                      </div>

                      {/* Mini Fuel Cycle Bar: paused machines keep the frozen progress. */}
                      <div className="cyber-card-fuel-bar">
                        <div
                          className="cyber-card-fuel-fill"
                          style={{
                            width: m.status === 'MINING' || m.status === 'PAUSED' ? `${minerRatio * 100}%` : m.status === 'READY' ? '0%' : '100%',
                            background:
                              m.status === 'MINING'
                                ? `linear-gradient(90deg, color-mix(in srgb, ${minerAccent(m.planId)} 50%, #17344b), ${minerAccent(m.planId)})`
                                : m.status === 'PAUSED'
                                  ? 'rgba(125, 148, 170, 0.45)'
                                  : m.status === 'READY'
                                    ? 'rgba(245, 158, 11, 0.4)'
                                    : 'rgba(100, 116, 139, 0.4)',
                          }}
                        />
                      </div>

                      <div className="cyber-card-metrics-grid">
                        <div className="cyber-card-metric-col">
                          <span>Produção registrada</span>
                          <strong>{money(m.totalEarnedCents)}</strong>
                        </div>
                        <div className="cyber-card-metric-col">
                          <span>Ciclo Estimado</span>
                          <strong style={{ color: 'var(--miner-accent)' }}>{money(m.cycleEstimatedCents)}</strong>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </motion.div>

          {!data.miners.filter(m => filter === 'ALL' || m.status === filter).length && (
            <div className="cyber-empty-panel">
              <div className="cyber-empty-icon">
                <Cpu size={32} />
              </div>
              <h2>{data.miners.length ? 'Nenhuma máquina neste filtro.' : 'Sua operação começa com uma máquina.'}</h2>
              <p>Conheça os modelos, a duração dos contratos e as condições de cada plano.</p>
              <Link className="cyber-cta-btn" to="/app/plans">
                Explorar Catálogo <ArrowUpRight size={15} />
              </Link>
            </div>
          )}
        </motion.section>

        {/* RIGHT COLUMN: SELECTED RIG QUANTUM DOCK */}
        <motion.section className="miner-detail cyber-master-dock" variants={fadeUp} style={{ '--miner-accent': selected ? minerAccent(selected.planId) : undefined } as CSSProperties}>
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.32, ease: dynamicEase }}
              >
                {/* Dock Header */}
                <header className="master-dock-header">
                  <button
                    className="icon-button detail-back master-dock-back-btn"
                    aria-label="Voltar para a frota"
                    onClick={() => setParams({})}
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="master-dock-heading-group">
                    <p className="eyebrow">
                      <Cpu size={12} /> VISÃO DA MÁQUINA
                    </p>
                    <h2>{selected.machine}</h2>
                    <span className="master-dock-contract-hash">
                      CONTRATO #{selected.id.slice(-8).toUpperCase()} // {selected.coin}
                    </span>
                  </div>
                  <span className={`cyber-status-pill ${statusClass(selected.status)}`}>
                    <i className="status-dot" />
                    {minerStatusLabel(selected.status)}
                  </span>
                </header>

                {/* 3D Holographic Stage with Three.js WebGL Particle Accelerator */}
                {(() => {
                  const isStarting = ignition.startingId === selected.id;
                  const currentStep = ignition.step;
                  return (
                    <>
                      <div
                        className={`quantum-hologram-stage ${
                          isStarting ? 'is-starting' : ''
                        } ${selected.status === 'MINING' ? 'is-mining' : ''} ${selected.status === 'PAUSED' ? 'is-paused' : ''}`}
                      >
                        {/* Three.js Quantum Particle Vortex & Ambient Reactor Field */}
                        <Suspense fallback={null}><QuantumReactorCanvas
                          planId={selected.planId}
                          active={selected.status === 'MINING'}
                          starting={isStarting}
                          step={currentStep}
                        /></Suspense>

                        {/* Atmospheric Shockwave & Horizon Energy Sweeps */}
                        <div className="quantum-stage-energy-ray" aria-hidden="true" />
                        <div className="quantum-stage-shockwave-ring" aria-hidden="true" />
                        <div className="quantum-stage-floor" aria-hidden="true" />

                        {/* Concentric Orbital Radial Progress SVG */}
                        <div className="quantum-orbit-ring" aria-hidden="true">
                          <svg viewBox="0 0 320 320">
                            <circle className="quantum-orbit-track" cx="160" cy="160" r="140" />
                            <circle
                              className="quantum-orbit-active-path"
                              cx="160"
                              cy="160"
                              r="140"
                              pathLength="100"
                              style={{
                                strokeDasharray: `${ratio * 100} 100`,
                                stroke: selected.status === 'MINING'
                                  ? minerAccent(selected.planId)
                                  : selected.status === 'PAUSED'
                                    ? '#7d94aa'
                                    : '#224666',
                              }}
                            />
                          </svg>
                        </div>

                        <MinerVisual
                          planId={selected.planId}
                          variant="hero"
                          active={selected.status === 'MINING'}
                          starting={isStarting}
                        />

                        {selected.status === 'PAUSED' && !isStarting && (
                          <div className="quantum-paused-flag" role="status">
                            <Pause size={12} />
                            <span>MÁQUINA DESLIGADA · TEMPO CONGELADO EM {countdown(selected.cycleEndsAt, cycleClock(selected, now))}</span>
                          </div>
                        )}

                        <div className="quantum-cipher-tag">
                          <Radio size={11} style={{ color: 'var(--miner-accent)' }} />
                          <span>
                            {plan?.algorithm ?? 'Algoritmo a conectar'} · {selected.coin}
                          </span>
                        </div>

                        {isStarting && <IgnitionStatus step={currentStep} />}
                      </div>

                      {ignition.requestingId === selected.id && (
                        <div className="boot-message" role="status">
                          <span className="loader-line" /> {ignition.action === 'pause' ? 'CONFIRMANDO PAUSA...' : ignition.action === 'resume' ? 'RELIGANDO MÁQUINA...' : 'CONFIRMANDO ATIVAÇÃO...'}
                        </div>
                      )}

                      {/* Quantum Reactor Activation Core */}
                      <div className="quantum-reactor-section">
                        <button
                          className={`quantum-reactor-trigger ${
                            selected.status === 'MINING'
                              ? 'state-mining'
                              : selected.status === 'PAUSED'
                                ? 'state-paused'
                                : selected.status === 'READY'
                                  ? 'state-ready'
                                  : 'state-expired'
                          } ${isStarting ? 'state-starting' : ''}`}
                          disabled={ignition.busy || !['READY', 'MINING', 'PAUSED'].includes(selected.status)}
                          onClick={() => {
                            if (selected.status === 'READY') {
                              ignition.activate(selected);
                            } else if (selected.status === 'MINING') {
                              ignition.pause(selected);
                            } else if (selected.status === 'PAUSED') {
                              ignition.resume(selected);
                            }
                          }}
                          aria-label={selected.status === 'READY' ? 'Ativar ciclo da máquina' : selected.status === 'MINING' ? 'Pausar o ciclo e desligar a máquina' : selected.status === 'PAUSED' ? 'Religar a máquina e retomar o ciclo' : 'Contrato encerrado'}
                        >
                          <Power size={36} />
                          <span>
                            {ignition.requestingId === selected.id
                              ? 'SINCRONIZANDO'
                              : isStarting
                                ? 'IGNIÇÃO...'
                                : selected.status === 'READY'
                                  ? 'ATIVAR CICLO'
                                  : selected.status === 'MINING'
                                    ? 'PAUSAR CICLO'
                                    : selected.status === 'PAUSED'
                                      ? 'RELIGAR MÁQUINA'
                                      : 'ENCERRADO'}
                          </span>
                          {selected.status === 'MINING' && !isStarting && (
                            <small style={{ fontSize: '7.5px', color: '#688fa8', letterSpacing: '0.5px' }}>
                              DESLIGA A MÁQUINA
                            </small>
                          )}
                          {selected.status === 'PAUSED' && !isStarting && (
                            <small style={{ fontSize: '7.5px', color: '#688fa8', letterSpacing: '0.5px' }}>
                              RETOMA O TEMPO CONGELADO
                            </small>
                          )}
                        </button>

                        <div className="quantum-yield-display">
                          <small>Mining Income Acumulado</small>
                          <strong>{money(selected.totalEarnedCents)}</strong>
                          <span>
                            <ShieldCheck size={13} style={{ color: '#10b981' }} />
                            Produção registrada
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* Telemetry Gauges Deck */}
                <div className="quantum-telemetry-gauges">
                  <Gauge value={ratio * 100} className="main-gauge" color={minerAccent(selected.planId)}>
                    <strong>
                      {number(ratio * 100, 1)}
                      <em style={{ fontSize: 13, fontStyle: 'normal', paddingLeft: 2 }}>%</em>
                    </strong>
                    <small>PROGRESSO DO CICLO</small>
                  </Gauge>

                  <Gauge
                    value={selected.status === 'MINING' ? 100 : 0}
                    color={selected.status === 'MINING' ? '#10b981' : selected.status === 'PAUSED' ? '#7d94aa' : '#52758d'}
                  >
                    <Clock3 size={18} />
                    <strong>{selected.status === 'MINING' || selected.status === 'PAUSED' ? countdown(selected.cycleEndsAt, cycleClock(selected, now)) : '24h'}</strong>
                    <small>{selected.status === 'MINING' ? 'TEMPO RESTANTE' : selected.status === 'PAUSED' ? 'CONGELADO NO RESTANTE' : 'DURAÇÃO DO CICLO'}</small>
                  </Gauge>

                  <Gauge value={selected.allocatedHashrate ? 100 : 0} color="#38bdf8">
                    <Radio size={18} />
                    <strong>
                      {selected.allocatedHashrate === null ? '—' : number(selected.allocatedHashrate, 2)}
                    </strong>
                    <small>{selected.hashrateUnit ?? 'HASHRATE A CONECTAR'}</small>
                  </Gauge>
                </div>

                {/* Production Stats Summary */}
                <div className="quantum-production-row">
                  <div>
                    <span>Previsto / ciclo</span>
                    <strong>{money(selected.cycleEstimatedCents)}</strong>
                  </div>
                  <div>
                    <span>Ciclos concluídos</span>
                    <strong>{number(selected.cycleCount)}</strong>
                  </div>
                  <div>
                    <span>Potência do plano</span>
                    <strong>
                      {selected.powerWeight} <small style={{ fontSize: 11, color: '#688fa8' }}>pts</small>
                    </strong>
                  </div>
                </div>

                {/* Encrypted Contract Terminal Drawer */}
                <div className="quantum-contract-drawer">
                  <button
                    className="quantum-drawer-toggle"
                    aria-expanded={expanded}
                    onClick={() => setExpanded(!expanded)}
                  >
                    <Cpu size={15} />
                    <span>Detalhes do contrato</span>
                    <ChevronDown size={16} className={expanded ? 'rotated' : ''} />
                  </button>

                  {expanded && (
                    <dl className="quantum-terminal-spec-grid">
                      <div className="quantum-spec-item">
                        <dt>Plano Contratado</dt>
                        <dd>{selected.planName}</dd>
                      </div>
                      <div className="quantum-spec-item">
                        <dt>Principal Contratado</dt>
                        <dd>{money(selected.principalCents)}</dd>
                      </div>
                      <div className="quantum-spec-item">
                        <dt>Taxa do Contrato</dt>
                        <dd style={{ color: '#10b981' }}>{percent(selected.rateBps)} / ciclo</dd>
                      </div>
                      <div className="quantum-spec-item">
                        <dt>Data de Início</dt>
                        <dd>{date(selected.startedAt)}</dd>
                      </div>
                      <div className="quantum-spec-item">
                        <dt>Expiração Prevista</dt>
                        <dd>{date(selected.expiresAt)}</dd>
                      </div>
                      {selected.pausedAt && (
                        <div className="quantum-spec-item">
                          <dt>Pausado em</dt>
                          <dd>{date(selected.pausedAt)}</dd>
                        </div>
                      )}
                      <div className="quantum-spec-item">
                        <dt>Hashrate Físico</dt>
                        <dd>
                          {selected.allocatedHashrate === null
                            ? 'Fonte a conectar'
                            : `${number(selected.allocatedHashrate, 2)} ${selected.hashrateUnit}`}
                        </dd>
                      </div>
                      <div className="quantum-spec-item" style={{ gridColumn: '1 / -1' }}>
                        <dt>Telemetria do Hardware</dt>
                        <dd>
                          {selected.hardwareStatus === 'UNAVAILABLE'
                            ? 'Telemetria física indisponível (Operação Cloud)'
                            : selected.hardwareStatus === 'ONLINE'
                              ? 'Hardware online'
                              : 'Hardware Offline'}
                        </dd>
                      </div>
                    </dl>
                  )}
                </div>

                <div className="quantum-hardware-note">
                  <Info size={15} />
                  <span>
                    {selected.status === 'MINING'
                      ? 'Pausar desliga a máquina e congela o tempo restante do ciclo. Nada é produzido enquanto ela estiver desligada.'
                      : selected.status === 'PAUSED'
                        ? `Máquina desligada. Ao religar, ela volta com o tempo que restava e a partida é exibida novamente. Retome antes de ${date(selected.expiresAt)}, quando o contrato encerra.`
                        : 'O botão ativa seu ciclo Cloud de 24h. Temperatura, consumo e estado físico dependem da integração ASIC.'}
                    {selected.isDemo && ' Ambiente demonstrativo; os créditos são simulados.'}
                  </span>
                </div>
              </motion.div>
            ) : (
              <div className="quantum-placeholder-dock">
                <div className="quantum-placeholder-reticle">
                  <Cpu size={54} strokeWidth={1.2} />
                </div>
                <div>
                  <p className="eyebrow" style={{ color: '#00e5ff', marginBottom: 6 }}>
                    CONTROLE DA FROTA
                  </p>
                  <h2>Selecione uma máquina.</h2>
                </div>
                <p>Abra uma máquina para ativar ou pausar seu ciclo, acompanhar o tempo restante e consultar o contrato.</p>
                {data.miners[0] && <button className="button button-secondary" onClick={() => choose(data.miners.find(m => m.status === 'READY') ?? data.miners[0])}>Abrir {data.miners.find(m => m.status === 'READY')?.machine ?? data.miners[0].machine} <ArrowUpRight size={15} /></button>}
              </div>
            )}
          </AnimatePresence>
        </motion.section>
      </div>
    </motion.div>
  );
}
