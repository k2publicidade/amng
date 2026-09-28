import { useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Check, Clock3, Cpu, Info, ShieldCheck, TicketPercent, Wallet, Zap } from 'lucide-react';
import type { BootstrapData, Plan } from '../../shared/types';
import type { PortalProps } from '../lib/portal';
import { ApiError, post } from '../lib/api';
import { money, percent } from '../lib/format';
import { pageVariants, staggerContainer, fadeUp, scaleIn } from '../lib/animations';
import MinerVisual from '../components/MinerVisual';
import Dialog from '../components/Dialog';

export default function PlansPage({ data, refresh, notify }: PortalProps) {
  const [params] = useSearchParams();
  const [selected, setSelected] = useState<Plan | null>(data.plans.find(p => p.id === params.get('plan')) ?? null);
  const [coupon, setCoupon] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempted, setAttempted] = useState(false);
  const pending = useRef<{ planId: string; couponCode: string; idempotencyKey: string } | null>(null);
  const [filter, setFilter] = useState('ALL');
  const wallet = data.wallets.find(w => w.id === 'deposit');
  const allowed = data.mode === 'demo' || Boolean(data.rules.find(r => r.id === 'cloud-purchases' && r.enabled && r.status === 'CONFIRMED') && selected?.status === 'APPROVED');
  const choose = (plan: Plan) => { if (pending.current && pending.current.planId !== plan.id) { notify('Conclua ou consulte a compra anterior antes de iniciar outra tentativa.', 'info'); return; } setSelected(plan); setError(''); setAccepted(false); if (!pending.current) { setCoupon(''); setAttempted(false); } };
  const purchase = async (event: FormEvent) => {
    event.preventDefault(); if (!selected || busy) return;
    setBusy(true); setError('');
    if (!pending.current) pending.current = { planId: selected.id, couponCode: coupon.trim().toUpperCase(), idempotencyKey: crypto.randomUUID() };
    setAttempted(true);
    try { const confirmed = await post<BootstrapData>('/orders', pending.current); await refresh(confirmed); pending.current = null; setAttempted(false); setSelected(null); notify(data.mode === 'demo' ? 'Compra simulada confirmada. A máquina já está na sua frota.' : 'Contrato confirmado. Sua máquina já está na frota.'); }
    catch (err) { if (err instanceof ApiError && err.status >= 400 && err.status < 500) { pending.current = null; setAttempted(false); } setError((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <motion.div
      className="plans-page"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="page-heading" variants={fadeUp}>
        <div>
          <p className="eyebrow">CLOUD MINING / CATÁLOGO AMNG</p>
          <h1>Sua próxima máquina<span className="heading-dot">.</span></h1>
          <p>Escolha o plano que combina com a sua operação.</p>
        </div>
        <div className="plan-wallet-balance">
          <Wallet size={18} />
          <span>Saldo de depósitos<strong>{money(wallet?.availableCents ?? 0)}</strong></span>
        </div>
      </motion.div>

      <motion.div className="plan-catalog-banner" variants={fadeUp}>
        <span className="banner-icon"><Cpu size={26} /></span>
        <div>
          <strong>7 modelos. Uma central.</strong>
          <p>130 dias de contrato Cloud. Taxas documentadas e regras de operação visíveis.</p>
        </div>
        <span className="badge">{data.mode === 'demo' ? 'COMPRAS SIMULADAS' : 'CATÁLOGO DOCUMENTADO'}</span>
      </motion.div>

      <motion.div className="plans-toolbar" variants={fadeUp}>
        <span className="eyebrow">EXPLORE A FROTA</span>
        <div className="segmented-control">
          {[['ALL', 'Todos'], ['START', 'Até US$ 350'], ['POWER', 'Mais potência']].map(([id, label]) => (
            <button key={id} className={filter === id ? 'active' : ''} aria-pressed={filter === id} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div className="plans-grid" variants={staggerContainer(0.06)}>
        {data.plans
          .filter(p => filter === 'ALL' || (filter === 'START' ? p.priceCents <= 35000 : p.priceCents > 35000))
          .map((p, i) => (
            <motion.article
              key={p.id}
              className="plan-card panel"
              variants={scaleIn}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <header>
                <span className="mono">{String(data.plans.findIndex(x => x.id === p.id) + 1).padStart(2, '0')} / CLOUD</span>
                <span className="plan-coin" style={{ color: p.color }}>{p.coin}</span>
              </header>
              <div className="plan-machine-art"><MinerVisual planId={p.id} variant="card" /></div>
              <div className="plan-card-body">
                <p className="eyebrow">{p.name}</p>
                <h2>{p.machine}</h2>
                <p className="plan-algorithm">{p.algorithm}</p>
                <div className="plan-price"><strong>{money(p.priceCents)}</strong><span>por contrato</span></div>
                <dl>
                  <div><dt><Clock3 size={14} />Duração</dt><dd>{p.durationDays} dias</dd></div>
                  <div><dt><Zap size={14} />Potência</dt><dd>{p.powerWeight} pontos</dd></div>
                  <div><dt><Cpu size={14} />Mining Income</dt><dd>{percent(p.rateBps)} / ciclo</dd></div>
                </dl>
                <button className="button button-secondary" onClick={() => choose(p)} disabled={p.status === 'PAUSED'}>
                  {p.status === 'PAUSED' ? 'Plano pausado' : data.mode === 'demo' ? 'Experimentar plano' : 'Ver detalhes'}
                  <ArrowUpRight size={17} />
                </button>
                <small>{p.status === 'APPROVED' ? 'Plano aprovado' : 'Taxa documentada. Operação real em preparação.'}</small>
              </div>
            </motion.article>
          ))}
      </motion.div>

      <motion.div className="plan-disclosure" variants={fadeUp}>
        <Info size={18} />
        <p>As taxas pertencem ao catálogo fornecido para o projeto. O crédito usa o contrato e as regras aprovadas no servidor. Na demonstração, compras e rendimentos são simulados. O plano não especifica devolução do principal ou garantia de retorno.</p>
      </motion.div>

      <Dialog open={Boolean(selected)} title={selected?.machine ?? 'Plano Cloud'} onClose={() => { if (!busy) setSelected(null); }}>
        {selected && (
          <form onSubmit={purchase}>
            <div className="order-preview">
              <MinerVisual planId={selected.id} variant="card" />
              <div>
                <span className="eyebrow">{selected.coin} / {selected.algorithm}</span>
                <h3>{selected.name}</h3>
                <strong>{money(selected.priceCents)}</strong>
                <p>{selected.durationDays} dias <span>·</span> {percent(selected.rateBps)} / ciclo</p>
              </div>
            </div>
            <div className="order-wallet">
              <Wallet size={18} />
              <span>Carteira de depósitos</span>
              <strong>{money(wallet?.availableCents ?? 0)}</strong>
            </div>
            <label className="field">Cupom de desconto
              <input value={coupon} onChange={e => setCoupon(e.target.value)} placeholder="CÓDIGO DO CUPOM" maxLength={40} disabled={busy || attempted} />
            </label>
            {!allowed && (
              <div className="pending-notice">
                <ShieldCheck size={20} />
                <div>
                  <strong>Contratação em preparação</strong>
                  <p>A operação real aguarda regras e capacidade aprovadas. Os detalhes do plano estão disponíveis para consulta.</p>
                </div>
              </div>
            )}
            {data.mode === 'demo' && (
              <div className="pending-notice">
                <Info size={19} />
                <p>Você está usando créditos de demonstração. Esta compra cria um contrato simulado.</p>
              </div>
            )}
            <label className="checkbox-field">
              <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} required disabled={!allowed || busy} />
              <span>Conferi o plano, o preço, a duração e o modo de operação acima.</span>
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" disabled={!allowed || !accepted || busy || (!attempted && (wallet?.availableCents ?? 0) < selected.priceCents)} className="button button-primary full-width">
              {busy ? 'Confirmando contrato...' : attempted ? 'Retomar a mesma compra' : data.mode === 'demo' ? 'Confirmar compra simulada' : 'Confirmar contratação'}
              <ArrowRight size={17} />
            </button>
            {(wallet?.availableCents ?? 0) < selected.priceCents && !attempted && (
              <p className="form-hint">O saldo de depósitos é inferior ao preço do plano.</p>
            )}
          </form>
        )}
      </Dialog>
    </motion.div>
  );
}
