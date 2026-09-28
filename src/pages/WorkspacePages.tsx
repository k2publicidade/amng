import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  Activity, ArrowDownLeft, ArrowRight, ArrowRightLeft, ArrowUpRight, Check, CheckCircle2,
  ChevronDown, ChevronRight, CircleHelp, CircuitBoard, Clock3, Copy, Download,
  ExternalLink, FileText, Fingerprint, Gauge, KeyRound, Layers3, LifeBuoy,
  LoaderCircle, LockKeyhole, Mail, MessageSquare, Network, Plus, Search,
  Server, ShieldCheck, ShieldOff, SlidersHorizontal, Timer, UsersRound, Wallet, X,
} from 'lucide-react';
import type { BootstrapData, LedgerEntry, MarketPosition, ProductRule, WalletId } from '../../shared/types';
import { ApiError, patch, post, setCsrfToken } from '../lib/api';
import { date, money, number, percent } from '../lib/format';
import { pageVariants, fadeUp, scaleIn, staggerContainer, dynamicEase } from '../lib/animations';
import { WalletStatement } from '../components/WalletStatement';
import CareerEvidence from '../components/CareerEvidence';
import './workspace.css';

export interface WorkspacePageProps {
  data: BootstrapData;
  refresh: () => Promise<void>;
  notify: (message: string, tone?: 'success' | 'error' | 'info') => void;
}

const walletNames: Record<WalletId, string> = { deposit: 'Depósitos', earnings: 'Rendimentos', affiliate: 'Afiliados' };
const statusNames: Record<string, string> = {
  CONFIRMED: 'Confirmado', PENDING: 'Pendente', RESERVED: 'Reservado', REVERSED: 'Estornado',
  ACTIVE: 'Ativa', WITHDRAWAL_PENDING: 'Retirada pendente', CLOSED: 'Encerrada',
  OPEN: 'Em atendimento', ANSWERED: 'Respondido', PROPOSAL: 'Proposta',
  AWAITING_FUNDING: 'Aguardando financiamento', CONNECTED: 'Conectada',
  NOT_CONFIGURED: 'Não configurada', ERROR: 'Requer atenção', APPROVED: 'Aprovado',
  READY: 'Pronta', MINING: 'Ciclo em andamento', EXPIRED: 'Expirado', CANCELLED: 'Cancelado',
  PAID: 'Creditado', SUSPENDED: 'Suspenso', NOT_QUALIFIED: 'Sem qualificação',
};
const kindNames: Record<string, string> = {
  DEPOSIT: 'Depósito', DEMO_DEPOSIT: 'Depósito simulado', PURCHASE: 'Contratação',
  CLOUD_PURCHASE: 'Contratação Cloud', DEMO_AFFILIATE_FIXTURE: 'Comissão simulada',
  MINING_INCOME: 'Produção de mineração', MINING: 'Produção de mineração',
  PROFIT_SHARING: 'Participação em resultados', COMMISSION: 'Comissão', AFFILIATE: 'Comissão de rede',
  WITHDRAWAL: 'Saque', WITHDRAWAL_RESERVE: 'Reserva de saque', CONVERSION: 'Conversão',
  WITHDRAWAL_RESERVED: 'Reserva de saque', WITHDRAWAL_REFUND: 'Devolução de reserva',
  CONVERSION_OUT: 'Conversão · saída', CONVERSION_IN: 'Conversão · crédito',
  MARKET_ENTRY: 'Entrada no Market', MARKET_WITHDRAWAL: 'Retirada do Market',
  MARKET_EARNINGS: 'Resultado do Market', SALARY: 'Salário confirmado', BONUS: 'Bônus',
  MARKET_PRINCIPAL_RETURN: 'Retorno de principal do Market',
  AFFILIATE_COMMISSION: 'Comissão de rede', AFFILIATE_REVERSAL: 'Estorno de comissão',
  CAREER_SALARY: 'Salário de carreira', CAREER_BONUS: 'Bônus de carreira',
};
const knownKind = (kind: string) => kindNames[kind] || 'Movimentação';
const ruleFor = (data: BootstrapData, id: string) => data.rules.find((rule) => rule.id === id);
const enabled = (data: BootstrapData, id: string) => data.mode === 'demo' || Boolean(ruleFor(data, id)?.enabled);
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível concluir a ação. Tente novamente.';
const dayMonth = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value));
const careerMonth = (value: string) => /^\d{4}-\d{2}$/.test(value)
  ? new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T00:00:00Z`))
  : value;

function centsFromInput(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, decimal = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function Status({ value, label }: { value: string; label?: string }) {
  return <span className={`w-status w-status--${value.toLowerCase()}`}><span aria-hidden="true" />{label || statusNames[value] || value}</span>;
}

function Page({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="w-page"
      variants={pageVariants}
      initial={reduced ? false : 'hidden'}
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

function Heading({ section, title, description, children }: { section: string; title: string; description: string; children?: ReactNode }) {
  return (
    <motion.header className="w-heading" variants={fadeUp}>
      <div>
        <p className="eyebrow">{section}</p>
        <h1>{title}</h1>
        <p className="w-description">{description}</p>
      </div>
      {children && <div className="w-heading-actions">{children}</div>}
    </motion.header>
  );
}

function Empty({ icon, title, detail, action }: { icon: ReactNode; title: string; detail: string; action?: ReactNode }) {
  return <div className="w-empty"><span className="w-empty-icon" aria-hidden="true">{icon}</span><h3>{title}</h3><p>{detail}</p>{action}</div>;
}

function FormError({ message }: { message: string }) {
  return message ? <p className="w-form-error" role="alert">{message}</p> : null;
}

function RuleNotice({ rule, title, demo = false }: { rule?: ProductRule; title?: string; demo?: boolean }) {
  if (demo) return <div className="w-rule-notice w-rule-notice--demo"><CircuitBoard size={18} /><div><strong>Ambiente de demonstração</strong><p>Esta operação utiliza saldo simulado, sem transferência de dinheiro real.</p></div></div>;
  if (rule?.enabled) return <div className="w-rule-notice w-rule-notice--approved"><ShieldCheck size={18} /><div><strong>{title || 'Condições vigentes da operação'}</strong><p>{rule.description}</p><Link to="/app/support">Consultar condições <ArrowRight size={13} /></Link></div></div>;
  return <div className="w-rule-notice"><LockKeyhole size={18} /><div><strong>{title || 'Operação em preparação'}</strong><p>{rule?.description || 'As condições operacionais precisam ser aprovadas para liberar esta ação.'}</p><Link to="/app/support">Consultar condições <ArrowRight size={13} /></Link></div></div>;
}

function SubmitButton({ busy, children, className = 'button button-primary', disabled = false }: { busy: boolean; children: ReactNode; className?: string; disabled?: boolean }) {
  return <button type="submit" className={className} disabled={busy || disabled}>{busy && <LoaderCircle size={16} className="w-spin" />}{busy ? 'Processando…' : children}</button>;
}

function Dialog({ title, children, onClose, canClose = true }: { title: string; children: ReactNode; onClose: () => void; canClose?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="w-dialog" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); if (canClose) onClose(); }} onClick={(event) => { if (canClose && event.target === ref.current) onClose(); }}><div className="w-dialog-inner"><header><h2 id={titleId}>{title}</h2><button type="button" className="w-icon-button" disabled={!canClose} onClick={onClose} aria-label="Fechar"><X size={20} /></button></header>{children}</div></dialog>;
}

async function copyText(value: string, notify: WorkspacePageProps['notify'], label: string) {
  try { await navigator.clipboard.writeText(value); notify(label, 'success'); }
  catch { notify('A cópia não está disponível neste navegador. Selecione o texto e copie manualmente.', 'info'); }
}

function downloadLedger(entries: LedgerEntry[], isDemo: boolean) {
  const protect = (value: string) => /^[=+@-]/.test(value) ? `'${value}` : value;
  const cell = (value: string) => `"${protect(value).replaceAll('"', '""')}"`;
  const rows = [
    ['Data UTC', 'Carteira', 'Tipo', 'Descrição', 'Valor USD', 'Estado', 'Referência', 'Demonstração'],
    ...entries.map((entry) => [entry.createdAt, walletNames[entry.wallet], knownKind(entry.kind), entry.description, (entry.amountCents / 100).toFixed(2), statusNames[entry.status], entry.reference, entry.isDemo ? 'Sim' : 'Não']),
  ];
  const blob = new Blob(['\uFEFF' + rows.map((row) => row.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `AMNG-extrato${isDemo ? '-demonstracao' : ''}-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
  URL.revokeObjectURL(url);
}

export function WalletsPage({ data, refresh, notify }: WorkspacePageProps) {
  const [params] = useSearchParams();
  const requestedTab = params.get('tab');
  const requestedWallet = params.get('wallet');
  const [wallet, setWallet] = useState<WalletId | 'all'>('all');
  const [action, setAction] = useState<'deposits' | 'withdrawals' | 'conversions'>('deposits');
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState<'earnings' | 'affiliate'>('earnings');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [statementRevision, setStatementRevision] = useState(0);
  const operationRef = useRef<HTMLElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const ledgerRef = useRef<HTMLElement>(null);
  const operationKey = useRef('');
  useEffect(() => {
    if (busy || uncertain) return;
    const tab = requestedTab === 'withdraw' ? 'withdrawals' : requestedTab === 'convert' ? 'conversions' : requestedTab === 'deposit' ? 'deposits' : null;
    const selectedWallet = requestedWallet === 'deposit' || requestedWallet === 'earnings' || requestedWallet === 'affiliate' ? requestedWallet : null;
    if (selectedWallet) { setWallet(selectedWallet); if (selectedWallet !== 'deposit') setSource(selectedWallet); }
    if (tab) { setAction(tab); setReview(false); setError(''); operationKey.current = ''; }
    if (!tab && !selectedWallet) return;
    const frame = requestAnimationFrame(() => {
      const target = tab ? operationRef.current : ledgerRef.current;
      target?.scrollIntoView({ block: 'start', behavior: 'instant' });
      if (tab && amountRef.current) amountRef.current.focus({ preventScroll: true });
      else target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [requestedTab, requestedWallet]);
  const canAct = enabled(data, action) || uncertain;
  const sourceWallet = data.wallets.find((item) => item.id === source);
  const value = centsFromInput(amount);
  const total = data.wallets.reduce((sum, item) => sum + item.balanceCents, 0);
  const changeAction = (value: typeof action) => { if (busy || uncertain) return; setAction(value); setError(''); setReview(false); setAmount(''); operationKey.current = ''; };
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canAct) { setError('Esta operação ainda não foi liberada para sua conta.'); return; }
    if (!value) { setError('Informe um valor em USD, com no máximo duas casas decimais.'); return; }
    if (!review && action !== 'deposits' && value > (sourceWallet?.availableCents || 0)) { setError('O valor é maior que o saldo livre desta carteira.'); return; }
    if (!review) { setError(''); operationKey.current = crypto.randomUUID(); setReview(true); return; }
    setBusy(true); setError('');
    let recorded = false;
    try {
      await post(`/wallets/${action}`, action === 'deposits' ? { amountCents: value, idempotencyKey: operationKey.current } : action === 'withdrawals' ? { wallet: source, amountCents: value, idempotencyKey: operationKey.current } : { from: source, amountCents: value, idempotencyKey: operationKey.current });
      recorded = true; setAmount(''); setReview(false); setUncertain(false); operationKey.current = ''; setStatementRevision(value => value + 1);
      await refresh();
      notify(data.mode === 'demo' ? 'Operação simulada registrada no extrato.' : action === 'deposits' ? 'Solicitação de depósito registrada.' : action === 'withdrawals' ? 'Solicitação de saque registrada.' : 'Conversão registrada.', 'success');
    } catch (failure) {
      if (recorded) notify('Operação registrada. Atualize a página para consultar o saldo mais recente.', 'info');
      else { setUncertain((previous) => previous || !(failure instanceof ApiError) || failure.status >= 500); setError(errorMessage(failure)); }
    }
    finally { setBusy(false); }
  }
  return <Page>
    <Heading section="FINANCEIRO / 06" title="Carteiras & extrato" description="Origem, disponibilidade e destino de cada movimento." />
    <motion.section className="w-wallet-overview" aria-label="Resumo das carteiras" variants={fadeUp}><div className="w-wallet-total"><span className="w-label">Saldo das três carteiras</span><strong>{money(total)}</strong><span className="w-micro">USD · disponibilidade por finalidade</span></div><motion.div className="w-wallet-cards" variants={staggerContainer(0.06)}>{data.wallets.map((item, index) => <motion.button type="button" key={item.id} className={`w-wallet-card w-wallet-card--${item.id} ${wallet === item.id ? 'is-selected' : ''}`} onClick={() => setWallet(wallet === item.id ? 'all' : item.id)} aria-pressed={wallet === item.id} variants={scaleIn} whileHover={{ y: -3, transition: { duration: 0.2 } }}><div className="w-wallet-card-label"><span>0{index + 1} / {item.label}</span><ArrowUpRight size={16} /></div><strong>{money(item.balanceCents)}</strong><p>{item.id === 'deposit' ? 'Saldo para contratações' : item.id === 'earnings' ? 'Produção e resultados' : 'Rede e carreira'}</p><div className="w-wallet-split"><span>Livre <b>{money(item.availableCents)}</b></span><span>Reservado <b>{money(item.reservedCents)}</b></span></div></motion.button>)}</motion.div></motion.section>
    <motion.div className="w-finance-layout" variants={fadeUp}>    <aside className="w-section w-operation" ref={operationRef} tabIndex={-1}><header className="w-section-heading"><div><h2>Movimentar saldo</h2><p>Revise os dados antes de confirmar.</p></div><ArrowRightLeft size={20} /></header><div className="w-tab-row" role="group" aria-label="Tipo de operação">{([['deposits', 'Depositar'], ['withdrawals', 'Sacar'], ['conversions', 'Converter']] as const).map(([id, label]) => <button type="button" key={id} onClick={() => changeAction(id)} disabled={busy || uncertain} className={action === id ? 'is-active' : ''} aria-pressed={action === id}>{label}</button>)}</div>
    {!canAct ? <RuleNotice rule={ruleFor(data, action)} title={action === 'deposits' ? 'Depósitos em preparação' : action === 'withdrawals' ? 'Saques em preparação' : 'Conversão em preparação'} /> : <><RuleNotice demo={data.mode === 'demo'} rule={ruleFor(data, action)} /><form onSubmit={submit} className="w-form">{action !== 'deposits' && <label className="w-field">Carteira de origem<select value={source} disabled={review || busy} onChange={(event) => setSource(event.target.value as typeof source)}><option value="earnings">Rendimentos</option><option value="affiliate">Afiliados</option></select><small>Livre: {money(sourceWallet?.availableCents || 0)}</small></label>}
    <label className="w-field">Valor em USD<div className="w-amount-input"><span>US$</span><input ref={amountRef} required inputMode="decimal" value={amount} disabled={review || busy} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" aria-describedby="wallet-amount-help" /></div><small id="wallet-amount-help">{action === 'deposits' ? 'O saldo para compra será atualizado conforme confirmação.' : action === 'withdrawals' ? 'Uma solicitação pode reservar o saldo até o processamento.' : 'Destino: carteira de depósitos. Em demonstração, conversão simulada de 1:1.'}</small></label>
    {review && value !== null && <div className="w-review"><p className="w-label">REVISÃO DA OPERAÇÃO</p><div><span>{action === 'deposits' ? 'Depósito' : action === 'withdrawals' ? 'Solicitação de saque' : 'Conversão'}</span><strong>{money(value)}</strong></div>{action !== 'deposits' && <div><span>Origem</span><b>{walletNames[source]}</b></div>}{action === 'conversions' && <div><span>Destino</span><b>Depósitos</b></div>}<p>{data.mode === 'demo' ? 'Saldo e movimentação são simulados.' : 'As condições vigentes serão verificadas pelo servidor.'}</p></div>}
    <FormError message={error} />{uncertain && <p className="w-uncertain-note" role="status">A resposta ficou indisponível. Verifique a operação com a mesma referência antes de iniciar outra.</p>}<SubmitButton busy={busy}>{uncertain ? 'Verificar operação' : review ? 'Confirmar operação' : 'Revisar operação'}<ArrowRight size={16} /></SubmitButton>{review && <button type="button" className="button button-ghost" disabled={busy || uncertain} onClick={() => setReview(false)}>Editar valor</button>}</form></>}
    <div className="w-operation-footnote"><ShieldCheck size={17} /><p>Valores reservados não ficam disponíveis para outra operação. Cada movimento recebe uma referência no extrato.</p></div></aside><WalletStatement ref={ledgerRef} wallet={wallet} onWalletChange={setWallet} isDemo={data.mode === 'demo'} refreshToken={`${data.user?.id}:${statementRevision}:${data.ledger[0]?.id}:${data.ledger.length}:${data.wallets.map(item => `${item.id}:${item.availableCents}:${item.reservedCents}`).join(',')}`} /></motion.div>
  </Page>;
}

function LedgerRow({ entry, open, onToggle }: { entry: LedgerEntry; open: boolean; onToggle: () => void }) {
  const positive = entry.amountCents >= 0;
  return <><tr><td><div className="w-ledger-title"><span className={`w-ledger-arrow ${positive ? 'is-positive' : ''}`}>{positive ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span><div><strong>{knownKind(entry.kind)}</strong><small>{date(entry.createdAt)}</small></div></div></td><td>{walletNames[entry.wallet]}</td><td><Status value={entry.status} /></td><td className={`w-align-right w-amount ${positive ? 'is-positive' : ''}`}>{positive ? '+' : '−'}{money(Math.abs(entry.amountCents))}</td><td><button className="w-icon-button" type="button" aria-expanded={open} aria-label={`Detalhes: ${entry.description}`} onClick={onToggle}>{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button></td></tr>{open && <tr className="w-ledger-detail"><td colSpan={5}><p>{entry.description}</p><dl><div><dt>Referência</dt><dd>{entry.reference}</dd></div><div><dt>Data de origem (UTC)</dt><dd>{new Date(entry.createdAt).toISOString()}</dd></div><div><dt>Ambiente</dt><dd>{entry.isDemo ? 'Demonstração' : 'Conta real'}</dd></div></dl></td></tr>}</>;
}

export function NetworkPage({ data, notify }: WorkspacePageProps) {
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [opened, setOpened] = useState<string[]>([]);
  const referral = `${window.location.origin}/register?ref=${encodeURIComponent(data.network.referralCode)}`;
  const lines = useMemo(() => {
    const groups = new Map<string, typeof data.network.members>();
    data.network.members.forEach((member) => { const key = member.line || member.id; groups.set(key, [...(groups.get(key) || []), member]); });
    return [...groups.entries()].map(([id, members]) => ({ id, members, direct: members.find((member) => member.level === 1) || members[0], power: members.reduce((sum, member) => sum + member.power, 0) }));
  }, [data.network.members]);
  const visibleLines = lines.filter((line) => line.members.some((member) => (!activeOnly || member.active) && (!search || `${member.name} ${member.id} ${member.line}`.toLowerCase().includes(search.toLowerCase()))));
  const commissions = data.ledger.filter((entry) => /COMMISSION|AFFILIATE/.test(entry.kind));
  return <Page><Heading section="ECOSSISTEMA / 07" title="Sua rede, em perspectiva" description="Linhas de participação, atividade e comissões com origem identificada."><Status value={ruleFor(data, 'affiliate')?.enabled ? 'CONFIRMED' : 'PENDING'} label={ruleFor(data, 'affiliate')?.enabled ? 'Regra publicada' : 'Regras em preparação'} /></Heading>
    <motion.div className="w-network-top" variants={fadeUp}><div className="w-stat-strip"><div><UsersRound size={18} /><span>Participantes diretos</span><strong>{number(data.network.directCount)}</strong></div><div><Activity size={18} /><span>Ativos na estrutura</span><strong>{number(data.network.activeCount)}</strong></div><div><Network size={18} /><span>Total da rede</span><strong>{number(data.network.totalCount)}</strong></div><div><Wallet size={18} /><span>Comissões de rede registradas</span><strong>{money(data.network.commissionCents)}</strong></div></div><section className="w-referral"><div><p className="w-label">SEU LINK DE INDICAÇÃO</p><strong>{data.network.referralCode || 'Código indisponível'}</strong><p>O vínculo é registrado durante o cadastro.</p></div><div className="w-copy-field"><input readOnly value={data.network.referralCode ? referral : ''} aria-label="Link de indicação" /><button type="button" onClick={() => copyText(referral, notify, 'Link de indicação copiado.')} disabled={!data.network.referralCode} aria-label="Copiar link de indicação"><Copy size={17} /></button></div></section></motion.div>
    <motion.div className="w-two-column" variants={fadeUp}><section className="w-section"><header className="w-section-heading"><div><h2>Estrutura por linha</h2><p>Abra uma linha para consultar os participantes.</p></div><span className="w-count">{lines.length} linhas</span></header><div className="w-network-filters"><label className="w-search"><Search size={16} /><input placeholder="Buscar participante" aria-label="Buscar participante na rede" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label className="w-checkbox"><input type="checkbox" checked={activeOnly} onChange={(event) => setActiveOnly(event.target.checked)} />Só participantes ativos</label></div><div className="w-network-root"><span className="w-avatar">{data.user?.name?.charAt(0).toUpperCase() || 'A'}</span><div><strong>{data.user?.name || 'Sua conta'}</strong><span>Você · raiz da sua estrutura</span></div><Network size={20} /></div>
    {visibleLines.length ? <div className="w-network-lines">{visibleLines.map((line, index) => { const isOpen = opened.includes(line.id); const visible = line.members.filter((member) => (!activeOnly || member.active) && (!search || `${member.name} ${member.id} ${member.line}`.toLowerCase().includes(search.toLowerCase()))); return <div key={line.id} className="w-network-line"><button type="button" className="w-line-heading" onClick={() => setOpened(isOpen ? opened.filter((id) => id !== line.id) : [...opened, line.id])} aria-expanded={isOpen}><span className="w-line-number">{String(index + 1).padStart(2, '0')}</span><div><strong>{line.direct.name}</strong><small>{line.members.length} participantes · {number(line.power)} de Potência</small></div><span className={`w-line-state ${line.direct.active ? 'is-active' : ''}`}>{line.direct.active ? 'Ativo' : 'Inativo'}</span><ChevronDown size={18} className={isOpen ? 'is-rotated' : ''} /></button>{isOpen && <div className="w-line-members">{visible.map((member) => <div className="w-line-member" key={member.id}><span className="w-level">N{member.level}</span><div><strong>{member.name}</strong><small>Desde {date(member.joinedAt)} · {member.contracts} contratos elegíveis</small></div><span>{number(member.power)} <small>pot.</small></span><span className={`w-line-state ${member.active ? 'is-active' : ''}`}>{member.active ? 'Ativo' : 'Inativo'}</span></div>)}</div>}</div>; })}</div> : <Empty icon={<UsersRound size={28} />} title={search || activeOnly ? 'Nenhum participante neste filtro' : 'Sua estrutura começa aqui'} detail={search || activeOnly ? 'Ajuste a busca para consultar outras linhas.' : 'Os vínculos aparecerão quando participantes se cadastrarem pelo seu link.'} />}
    <p className="w-section-note"><ShieldCheck size={15} />Esta visualização não expõe e-mails, carteiras ou dados de segurança de outros participantes.</p></section>
    <aside className="w-section"><header className="w-section-heading"><div><h2>Comissões por nível</h2><p>Percentuais documentados no escopo.</p></div><Layers3 size={20} /></header><div className="w-table-scroll"><table className="w-table w-rates-table"><thead><tr><th>Nível</th><th>1ª compra</th><th>Recompra</th></tr></thead><tbody>{data.network.commissionRates.map((rate) => <tr key={rate.level}><td><span className="w-level">N{rate.level}</span></td><td>{rate.firstBps === null ? <span className="w-pending-value">A definir</span> : percent(rate.firstBps)}</td><td>{percent(rate.recurringBps)}</td></tr>)}</tbody></table></div><RuleNotice rule={ruleFor(data, 'affiliate')} title="Elegibilidade e base de cálculo" />
    <div className="w-recent-commissions"><h3>Últimos registros de comissão</h3>{commissions.length ? commissions.slice(0, 4).map((entry) => <div key={entry.id}><span>{entry.description}<small>{date(entry.createdAt)}</small></span><b className={entry.amountCents < 0 ? 'is-negative' : undefined}>{money(entry.amountCents)}</b></div>) : <p className="w-muted">Nenhuma comissão registrada.</p>}<Link to="/app/wallets?wallet=affiliate" className="w-text-link">Abrir extrato <ArrowRight size={15} /></Link></div></aside></motion.div>
  </Page>;
}

function PulseRing({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const circumference = 2 * Math.PI * 76;
  const normalized = Math.max(0, Math.min(100, value));
  return <div className="w-pulse-ring"><svg viewBox="0 0 180 180" role="img" aria-label={`Pulso: ${number(value, 1)} de 100 pontos`}><circle className="w-ring-track" cx="90" cy="90" r="76" /><motion.circle className="w-ring-value" cx="90" cy="90" r="76" strokeDasharray={circumference} initial={reduced ? false : { strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference * (1 - normalized / 100) }} transition={{ duration: .9, ease: [.22, 1, .36, 1] }} /></svg><div aria-hidden="true"><strong>{number(value, 1)}</strong><span>PULSO / 100</span></div></div>;
}

function CareerHistory({ history }: { history: BootstrapData['career']['history'] }) {
  if (!history.length) return <Empty icon={<Activity size={25} />} title="O histórico ainda está vazio" detail="As competências aparecerão após os fechamentos registrados." />;
  const width = 640, height = 170, pad = 18;
  const x = (index: number) => pad + index * (width - pad * 2) / Math.max(1, history.length - 1);
  const pulseY = (value: number) => height - pad - Math.min(100, value) * (height - pad * 2) / 100;
  const maxPower = Math.max(1, ...history.map((item) => item.power));
  const powerY = (value: number) => height - pad - value * (height - pad * 2) / maxPower;
  return <div className="w-history-chart"><div className="w-chart-key"><span><i />Pulso · escala 0–100</span><span><i />Potência · escala 0–{number(maxPower)}</span></div><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Histórico mensal de Pulso e Potência. Os valores completos estão abaixo.">{[25, 50, 75].map((tick) => <line key={tick} x1={pad} x2={width - pad} y1={pulseY(tick)} y2={pulseY(tick)} className="w-chart-grid" />)}<polyline points={history.map((item, index) => `${x(index)},${powerY(item.power)}`).join(' ')} className="w-power-line" /><polyline points={history.map((item, index) => `${x(index)},${pulseY(item.pulse)}`).join(' ')} className="w-pulse-line" />{history.map((item, index) => <circle key={item.month} cx={x(index)} cy={pulseY(item.pulse)} r="4" className="w-chart-point" />)}</svg><div className="w-history-values">{history.map((item) => <div key={item.month}><span>{item.month}</span><strong>{number(item.pulse, 1)} <small>pulso</small></strong><b>{number(item.power)} <small>potência</small></b></div>)}</div></div>;
}

export function CareerPage({ data }: WorkspacePageProps) {
  const career = data.career;
  const demo = data.mode === 'demo';
  const currentStage = career.stages.findIndex((stage) => stage.name === career.stage);
  const qualifying = data.miners.filter((miner) => miner.status === 'READY' || miner.status === 'MINING');
  const payroll = data.ledger.filter((entry) => /SALARY|BONUS|CAREER/.test(entry.kind));
  const funding = career.funding;
  const currentMonth = funding?.month || new Date(new Date(career.nextClosingAt).getTime() - 1).toISOString().slice(0, 7);
  const salaryState = career.salaryStatus || 'NOT_QUALIFIED';
  const salaryLabel = salaryState === 'PAID' ? demo ? 'Crédito simulado registrado' : 'Crédito registrado'
    : salaryState === 'AWAITING_FUNDING' ? 'Aguardando orçamento'
    : salaryState === 'SUSPENDED' ? 'Remuneração suspensa' : 'Sem posição remunerada';
  const closedQualification = Math.max(0, Math.min(2, career.qualificationMonths));
  const qualifiedPeriods = closedQualification ? career.history.slice(-closedQualification) : [];
  const progress = Math.max(0, Math.min(100, career.power / Math.max(1, career.nextPower) * 100));
  const lastMonth = career.lastClosedMonth ? careerMonth(career.lastClosedMonth) : null;

  return <Page>
    <Heading section="CARREIRA / 08" title="Pulso + Potência" description="Consistência da operação e capacidade elegível, competência por competência.">
      <Status value={demo ? 'PROPOSAL' : career.status} label={demo ? 'Carreira em demonstração' : 'Modelo em validação'} />
    </Heading>
    <motion.div className={`w-career-banner ${demo ? 'w-career-banner--demo' : ''}`} variants={fadeUp}>
      {demo ? <CircuitBoard size={19} /> : <CircleHelp size={19} />}
      <p>{demo ? <><strong>Demonstração de carreira.</strong> Pontuação, fechamentos, orçamento e créditos usam dados simulados. As regras de salários e bônus permanecem propostas para a operação real.</> : <>O modelo de carreira, salários e bônus é uma <strong>proposta em validação</strong>. Uma etapa registrada e uma posição remunerada têm estados próprios. A liberação depende da aprovação das regras e do orçamento.</>}</p>
    </motion.div>
    <motion.section className="w-career-hero" variants={fadeUp} aria-label="Resumo da carreira">
      <div className="w-pulse-block">
        <PulseRing value={career.pulse} />
        <div><p className="w-label">COMPETÊNCIA EM APURAÇÃO</p><h2>{careerMonth(currentMonth)}</h2><p>O Pulso atual reúne quatro componentes da operação. A qualificação é registrada no fechamento.</p></div>
      </div>
      <div className="w-power-block">
        <p className="w-label">CAPACIDADE ELEGÍVEL</p><strong>{number(career.power)}<span>Potência</span></strong>
        {(career.ownPower !== undefined || career.networkPower !== undefined) && <dl className="w-power-sources">
          {career.ownPower !== undefined && <div><dt>Seus contratos</dt><dd>{number(career.ownPower)}</dd></div>}
          {career.networkPower !== undefined && <div><dt>Sua rede</dt><dd>{number(career.networkPower)}</dd></div>}
        </dl>}
        <p>Limite de {career.nextStage}: {number(career.nextPower)}</p>
        <div className="w-progress" role="progressbar" aria-label={`Potência para ${career.nextStage}`} aria-valuenow={Math.max(0, Math.min(career.power, career.nextPower))} aria-valuemin={0} aria-valuemax={career.nextPower}><span style={{ width: `${progress}%` }} /></div>
      </div>
      <div className="w-stage-block">
        <p className="w-label">ETAPA REGISTRADA</p><h2>{career.stage || 'EM FORMAÇÃO'}</h2>
        <Status value={salaryState} label={salaryLabel} />
        <div className="w-salary-detail">
          <span>{demo ? 'Crédito simulado' : 'Crédito registrado'}<strong>{money(career.confirmedSalaryCents)}</strong></span>
          <span>Referência proposta<strong>{money(career.proposedSalaryCents)}</strong></span>
        </div>
        <small>{lastMonth ? `Último fechamento: ${lastMonth}.` : 'Nenhum fechamento registrado.'} A referência mensal da etapa não representa um pagamento futuro.</small>
      </div>
    </motion.section>
    <motion.div className="w-career-main" variants={fadeUp}>
      <section className="w-section">
        <header className="w-section-heading"><div><h2>De onde vem o Pulso</h2><p>Contribuição de cada componente na competência em apuração.</p></div><Activity size={20} /></header>
        <div className="w-pulse-components">{career.components.map((component, index) => <details key={component.id} className="w-pulse-component">
          <summary><span className="w-component-index">0{index + 1}</span><div><strong>{component.name}</strong><div className="w-component-meter"><span style={{ width: `${Math.max(0, Math.min(100, component.score / Math.max(1, component.max) * 100))}%` }} /></div></div><span className="w-component-score">{number(component.score, 1)}<small> / {component.max}</small></span><ChevronDown size={16} /></summary>
          <p>{component.description}</p>
        </details>)}</div>
      </section>
      <section className="w-section w-qualification">
        <header className="w-section-heading"><div><h2>Janela de qualificação</h2><p>Dois fechamentos consecutivos elegíveis para {career.nextStage}.</p></div><Timer size={20} /></header>
        <div className="w-closing-steps">{[1, 2].map((step) => <div key={step} className={closedQualification >= step ? 'is-done' : ''}>
          <span>{closedQualification >= step ? <Check size={19} /> : `0${step}`}</span><strong>{step}º fechamento</strong><small>{closedQualification >= step ? `${qualifiedPeriods[step - 1] ? careerMonth(qualifiedPeriods[step - 1].month) : 'Competência registrada'} · elegível` : 'Aguardando fechamento elegível'}</small>
        </div>)}</div>
        <dl className="w-detail-list">
          <div><dt>Próxima etapa</dt><dd>{career.nextStage}</dd></div>
          <div><dt>Limites propostos</dt><dd>{number(career.nextPulse)} Pulso / {number(career.nextPower)} Potência</dd></div>
          <div><dt>Última competência fechada</dt><dd>{lastMonth || 'Sem fechamento'}</dd></div>
          <div><dt>Próximo fechamento</dt><dd>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(career.nextClosingAt))} · UTC</dd></div>
        </dl>
        <p className="w-section-note"><ShieldCheck size={15} />A janela considera apenas competências concluídas. A pontuação em apuração será avaliada no próximo fechamento.</p>
      </section>
    </motion.div>
    <motion.section className="w-section w-career-ladder" variants={fadeUp}>
      <header className="w-section-heading"><div><h2>Etapas de desenvolvimento</h2><p>Limites e salários mensais propostos no documento de carreira.</p></div><span className="w-pending-value">PROPOSTA</span></header>
      <div className="w-stage-ladder">{career.stages.map((stage, index) => <div key={stage.name} className={`${index <= currentStage ? 'is-reached' : ''} ${stage.name === career.nextStage ? 'is-next' : ''}`}>
        <span className="w-stage-number">{String(index + 1).padStart(2, '0')}</span><h3>{stage.name}</h3><p>{stage.pulse} Pulso <span>/</span> {stage.power} Potência</p><strong>{money(stage.salaryCents)}<small>/mês proposto</small></strong><span className="w-stage-caption">{stage.name === career.stage ? 'Etapa registrada' : stage.name === career.nextStage ? 'Próximo limite' : index < currentStage ? 'Etapa alcançada' : 'Etapa proposta'}</span>
      </div>)}</div>
    </motion.section>
    <motion.div className="w-two-column" variants={fadeUp}>
      <section className="w-section">
        <header className="w-section-heading"><div><h2>Evolução por competência</h2><p>Somente fechamentos registrados. As séries têm escalas próprias.</p></div><Gauge size={20} /></header>
        <CareerHistory history={career.history} />
      </section>
      <section className="w-section">
        <header className="w-section-heading"><div><h2>Seus contratos elegíveis</h2><p>Parte própria da Potência. A participação da rede aparece no resumo.</p></div><CircuitBoard size={20} /></header>
        {qualifying.length ? <div className="w-power-contracts">{qualifying.map((miner) => <div key={miner.id}>
          <img src={miner.image} alt="" loading="lazy" /><div><strong>{miner.planName}</strong><small>Até {date(miner.expiresAt)}</small></div><b>+{miner.powerWeight}<small>peso documentado</small></b>
        </div>)}</div> : <Empty icon={<CircuitBoard size={25} />} title="Sem contratos elegíveis" detail="A composição será atualizada quando houver contratos vigentes." action={<Link className="button button-secondary" to="/app/plans">Explorar planos <ArrowRight size={15} /></Link>} />}
      </section>
    </motion.div>
    {funding && <motion.section className="w-section w-career-funding" variants={fadeUp}>
      <header className="w-section-heading"><div><h2>Orçamento da competência</h2><p>{careerMonth(funding.month)} · {demo ? 'fundo coletivo da demonstração' : 'fundo coletivo da operação'}</p></div><Wallet size={20} /></header>
      <div className="w-table-scroll" tabIndex={0} role="region" aria-label="Orçamento coletivo da carreira. Role horizontalmente para mais colunas.">
        <table className="w-table w-funding-table"><thead><tr><th>Finalidade</th><th>Financiado</th><th>Creditado</th><th>Disponível</th></tr></thead><tbody>
          <tr><td><strong>Salários</strong><small>4% propostos</small></td><td>{money(funding.salaryFundedCents)}</td><td>{money(funding.salaryPaidCents)}</td><td className="w-amount is-positive">{money(funding.salaryAvailableCents)}</td></tr>
          <tr><td><strong>Bônus</strong><small>0,75% propostos</small></td><td>{money(funding.bonusFundedCents)}</td><td>{money(funding.bonusPaidCents)}</td><td className="w-amount is-positive">{money(funding.bonusAvailableCents)}</td></tr>
          <tr><td><strong>Reserva</strong><small>0,25% propostos</small></td><td aria-label="Valor financiado da reserva não informado">—</td><td aria-label="Créditos da reserva não informados">—</td><td className="w-amount">{money(funding.reserveCents)}</td></tr>
        </tbody></table>
      </div>
      <p className="w-section-note">{demo ? 'Na simulação, 5% das compras são distribuídos entre salários, bônus e reserva ao longo de cinco competências. Este orçamento atende o conjunto de participantes da demonstração.' : 'A proposta destina 5% das compras a salários, bônus e reserva em cinco competências. A disponibilidade do fundo coletivo não confirma um pagamento para sua conta.'}</p>
    </motion.section>}
    <motion.div className="w-two-column" variants={fadeUp}>
      <section className="w-section w-bonus-info">
        <header className="w-section-heading"><div><h2>Manutenção e bônus</h2><p>Condições propostas e resultado do último fechamento.</p></div><span className="w-pending-value">PROPOSTA</span></header>
        {lastMonth && <div className="w-career-last-result"><div><span className="w-label">{lastMonth}</span><strong>Manutenção: {percent(career.maintenanceBps ?? 10000)}</strong></div><Status value={salaryState} label={salaryLabel} />{career.bonusStatus && <div className="w-last-bonus"><span>Bônus apurado <b>{money(career.bonusCents ?? 0)}</b></span><Status value={career.bonusStatus} label={career.bonusStatus === 'PAID' ? demo ? 'Crédito simulado' : 'Creditado' : career.bonusStatus === 'AWAITING_FUNDING' ? 'Aguardando orçamento' : 'Sem bônus elegível'} /></div>}</div>}
        <div className="w-bonus-row"><div><strong>Consistência do Pulso</strong><p>Melhora de pelo menos 10 pontos, mantida no fechamento seguinte.</p></div><b>{money(500)}</b></div>
        <div className="w-bonus-row"><div><strong>Promoção de etapa</strong><p>Uma concessão por etapa registrada, dentro do orçamento da competência.</p></div><b>{money(1500)}</b></div>
        <p className="w-section-note">A proposta considera o maior bônus elegível do mês. Sem manutenção dos limites: salário integral no primeiro fechamento, 50% no segundo e suspensão no terceiro. A recuperação depende de atender Pulso e Potência novamente.</p>
      </section>
      <section className="w-section">
        <header className="w-section-heading"><div><h2>Histórico de remuneração</h2><p>{demo ? 'Créditos simulados de salários e bônus, separados das comissões.' : 'Créditos de salários e bônus, separados das comissões.'}</p></div><FileText size={20} /></header>
        {payroll.length ? <div className="w-recent-commissions">{payroll.slice(0, 8).map((entry) => <div key={entry.id}>
          <span>{knownKind(entry.kind)}<small>{entry.description}</small><small>{date(entry.createdAt)} · {statusNames[entry.status]}{entry.isDemo ? ' · demonstração' : ''}</small></span><b>{money(entry.amountCents)}</b>
        </div>)}<Link className="w-text-link" to="/app/wallets?wallet=affiliate">Abrir extrato completo <ArrowRight size={15} /></Link></div> : <Empty icon={<FileText size={24} />} title="Sem créditos de carreira" detail={demo ? 'Os créditos simulados aparecerão após um fechamento elegível com orçamento disponível.' : 'Um valor proposto só vira lançamento após elegibilidade, orçamento e processamento.'} />}
      </section>
    </motion.div>
    {data.user && <CareerEvidence userId={data.user.id} isDemo={demo} initialMonth={career.lastClosedMonth ?? undefined} />}
  </Page>;
}
export function ProfilePage({ data, refresh, notify }: WorkspacePageProps) {
  const [name, setName] = useState(data.user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordTotp, setPasswordTotp] = useState('');
  const [twoFactorPassword, setTwoFactorPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [disable, setDisable] = useState(false);
  const [busy, setBusy] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const setError = (key: string, value: string) => setErrors((previous) => ({ ...previous, [key]: value }));
  const strong = newPassword.length >= 12;
  async function saveName(event: FormEvent) {
    event.preventDefault(); setBusy('profile'); setError('profile', '');
    try { await patch('/profile', { name: name.trim() }); await refresh(); notify('Perfil atualizado.', 'success'); }
    catch (failure) { setError('profile', errorMessage(failure)); } finally { setBusy(''); }
  }
  async function savePassword(event: FormEvent) {
    event.preventDefault(); setError('password', '');
    if (newPassword !== confirmPassword) { setError('password', 'As duas novas senhas precisam ser iguais.'); return; }
    if (!strong) { setError('password', 'Use pelo menos 12 caracteres na nova senha.'); return; }
    setBusy('password');
    let recorded = false;
    try { const updated = await post<BootstrapData>('/auth/password', { currentPassword, newPassword, ...(data.user?.twoFactorEnabled ? { totp: passwordTotp } : {}) }); recorded = true; setCsrfToken(updated.csrfToken); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordTotp(''); await refresh(); notify('Senha alterada.', 'success'); }
    catch (failure) { if (recorded) notify('Senha alterada. Atualize a página para consultar os dados da nova sessão.', 'info'); else setError('password', errorMessage(failure)); } finally { setBusy(''); }
  }
  async function setupTwoFactor(event: FormEvent) {
    event.preventDefault(); setBusy('2fa'); setError('2fa', '');
    try { const response = await post<{ secret: string; uri: string }>('/auth/2fa/setup', { password: twoFactorPassword }); setSetup(response); setTwoFactorPassword(''); }
    catch (failure) { setError('2fa', errorMessage(failure)); } finally { setBusy(''); }
  }
  async function confirmTwoFactor(event: FormEvent) {
    event.preventDefault(); setBusy('2fa'); setError('2fa', '');
    let recorded = false;
    try { const updated = await post<BootstrapData>(disable ? '/auth/2fa/disable' : '/auth/2fa/confirm', disable ? { password: twoFactorPassword, totp } : { totp }); recorded = true; setCsrfToken(updated.csrfToken); setSetup(null); setDisable(false); setTotp(''); setTwoFactorPassword(''); await refresh(); notify(disable ? 'Autenticação em duas etapas desativada.' : 'Autenticação em duas etapas ativada.', 'success'); }
    catch (failure) { if (recorded) notify('Configuração de segurança atualizada. Atualize a página para consultar o estado mais recente.', 'info'); else setError('2fa', errorMessage(failure)); } finally { setBusy(''); }
  }
  return <Page><Heading section="CONTA / SEGURANÇA" title="Perfil & proteção" description="Seus dados de acesso e uma camada extra para cada ação sensível." />
    <motion.div className="w-profile-layout" variants={fadeUp}><section className="w-section"><header className="w-section-heading"><div><h2>Identidade da conta</h2><p>Dados usados no seu acesso ao AMNG.</p></div><Fingerprint size={20} /></header><div className="w-profile-identity"><span className="w-profile-avatar">{data.user?.name?.charAt(0).toUpperCase() || 'A'}</span><div><strong>{data.user?.name}</strong><span>{data.user?.role === 'ADMIN' ? 'Administrador' : 'Participante'} · desde {data.user ? date(data.user.createdAt) : '—'}</span></div></div><form className="w-form" onSubmit={saveName}><label className="w-field">Nome de exibição<input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label><label className="w-field">E-mail<input value={data.user?.email || ''} readOnly type="email" /><small>Para alterar o e-mail, abra uma solicitação de suporte.</small></label><label className="w-field">Código de indicação<input value={data.user?.referralCode || ''} readOnly /></label><FormError message={errors.profile || ''} /><SubmitButton busy={busy === 'profile'} disabled={Boolean(busy) || name.trim() === data.user?.name}>Salvar perfil <Check size={16} /></SubmitButton></form></section>
    <section className="w-section"><header className="w-section-heading"><div><h2>Alterar senha</h2><p>Use uma senha exclusiva para sua conta.</p></div><KeyRound size={20} /></header><form className="w-form" onSubmit={savePassword}><label className="w-field">Senha atual<input type="password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /></label><label className="w-field">Nova senha<input type="password" minLength={12} maxLength={128} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" /><small>12 caracteres ou mais. Escolha uma senha exclusiva para esta conta.</small></label><label className="w-field">Confirme a nova senha<input type="password" minLength={12} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" /></label>{data.user?.twoFactorEnabled && <label className="w-field">Código do autenticador<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={passwordTotp} onChange={(event) => setPasswordTotp(event.target.value.replace(/\D/g, ''))} autoComplete="one-time-code" /></label>}<FormError message={errors.password || ''} /><SubmitButton busy={busy === 'password'} disabled={Boolean(busy)}>Atualizar senha <ArrowRight size={16} /></SubmitButton></form></section>
    <section className="w-section w-2fa-section"><header className="w-section-heading"><div><h2>Autenticação em duas etapas</h2><p>Um código temporário além da sua senha.</p></div><ShieldCheck size={22} /></header><div className="w-security-state"><span className={data.user?.twoFactorEnabled ? 'is-enabled' : ''}>{data.user?.twoFactorEnabled ? <ShieldCheck size={26} /> : <ShieldOff size={26} />}</span><div><strong>{data.user?.twoFactorEnabled ? 'Proteção adicional ativa' : 'Adicione proteção à sua conta'}</strong><p>{data.user?.twoFactorEnabled ? 'Seu aplicativo autenticador gera os códigos de acesso.' : 'Configure um aplicativo compatível com códigos TOTP.'}</p></div><Status value={data.user?.twoFactorEnabled ? 'CONFIRMED' : 'PENDING'} label={data.user?.twoFactorEnabled ? 'Ativa' : 'Não configurada'} /></div>
    {data.user?.twoFactorEnabled && !disable ? <button type="button" className="button button-secondary" onClick={() => { setDisable(true); setError('2fa', ''); }}>Desativar duas etapas</button> : setup || disable ? <form className="w-form w-2fa-form" onSubmit={confirmTwoFactor}>{setup && !disable && <><div className="w-setup-instructions"><span>01</span><div><strong>Adicione a chave ao autenticador</strong><p>Escolha “inserir chave de configuração” no aplicativo e use a chave abaixo com códigos baseados em tempo.</p></div></div><div className="w-secret-field"><code>{setup.secret}</code><button type="button" className="w-icon-button" aria-label="Copiar chave de configuração" onClick={() => copyText(setup.secret, notify, 'Chave de configuração copiada.')}><Copy size={17} /></button></div><a className="w-text-link" href={setup.uri}>Abrir aplicativo autenticador <ExternalLink size={14} /></a><div className="w-setup-instructions"><span>02</span><div><strong>Confirme um código</strong><p>Digite os seis números exibidos no aplicativo para concluir.</p></div></div></>}{disable && <label className="w-field">Senha atual<input type="password" required value={twoFactorPassword} onChange={(event) => setTwoFactorPassword(event.target.value)} autoComplete="current-password" /></label>}<label className="w-field">Código do autenticador<input inputMode="numeric" required pattern="[0-9]{6}" maxLength={6} value={totp} onChange={(event) => setTotp(event.target.value.replace(/\D/g, ''))} autoComplete="one-time-code" placeholder="000000" /></label><FormError message={errors['2fa'] || ''} /><div className="w-form-actions"><SubmitButton busy={busy === '2fa'} disabled={Boolean(busy)}>{disable ? 'Confirmar desativação' : 'Ativar duas etapas'}<Check size={16} /></SubmitButton><button type="button" className="button button-ghost" disabled={Boolean(busy)} onClick={() => { setSetup(null); setDisable(false); setTotp(''); setTwoFactorPassword(''); setError('2fa', ''); }}>Cancelar</button></div></form> : <form className="w-form w-2fa-form" onSubmit={setupTwoFactor}><label className="w-field">Confirme sua senha<input type="password" required value={twoFactorPassword} onChange={(event) => setTwoFactorPassword(event.target.value)} autoComplete="current-password" /></label><FormError message={errors['2fa'] || ''} /><SubmitButton busy={busy === '2fa'} disabled={Boolean(busy)}>Configurar autenticador <ShieldCheck size={16} /></SubmitButton></form>}
    </section></motion.div><motion.div className="w-profile-help" variants={fadeUp}><LifeBuoy size={19} /><p>Precisa recuperar o acesso ou alterar dados da conta?</p><Link to="/app/support" className="w-text-link">Falar com o suporte <ArrowRight size={16} /></Link></motion.div>
  </Page>;
}

const helpTopics = [
  { title: 'Como funciona a ativação de uma máquina?', text: 'A ativação inicia um ciclo de 24 horas somente após confirmação do servidor. O ciclo da conta e o estado físico do equipamento são informações diferentes. Uma integração sem dados não será exibida como hardware online.' },
  { title: 'Por que há saldo reservado na minha carteira?', text: 'Reservas separam valores associados a operações em processamento. Consulte o extrato para localizar a referência, o tipo e o estado. Um resultado de operação externa ainda incerto deve ser conciliado antes da liberação.' },
  { title: 'O que significa um produto em preparação?', text: 'Algumas condições do produto ainda precisam de aprovação, como taxa, disponibilidade, calendário ou liquidação. Enquanto isso, a operação correspondente permanece desabilitada para dinheiro real.' },
  { title: 'O salário da carreira já está confirmado?', text: 'Os valores do documento Pulso + Potência são uma proposta. A etapa e a posição remunerada têm estados separados. Pagamentos dependem de confirmação, financiamento e processamento registrado no extrato.' },
];

export function SupportPage({ data, refresh, notify }: WorkspacePageProps) {
  const [params] = useSearchParams();
  const requestedSubject = params.get('subject') || '';
  const [subject, setSubject] = useState(requestedSubject);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const tickets = data.tickets.filter((ticket) => filter === 'all' || ticket.status === filter);
  useEffect(() => { if (requestedSubject) setSubject(requestedSubject); }, [requestedSubject]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    let recorded = false;
    try { await post('/support/tickets', { subject: subject.trim(), message: message.trim() }); recorded = true; setSubject(''); setMessage(''); setFilter('all'); await refresh(); notify('Chamado enviado. Você pode acompanhar a resposta nesta página.', 'success'); }
    catch (failure) { if (recorded) notify('Chamado registrado. Atualize a página para consultar o atendimento.', 'info'); else setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  return <Page><Heading section="SUPORTE / OPERAÇÃO" title="Vamos resolver" description="Um canal para dúvidas, ajustes de conta e acompanhamento de operações."><button type="button" className="button button-primary" onClick={() => { formRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' }); formRef.current?.querySelector('input')?.focus({ preventScroll: true }); }}><Plus size={17} />Novo chamado</button></Heading>
    <motion.div className="w-support-layout" variants={fadeUp}><section className="w-section"><header className="w-section-heading"><div><h2>Seu atendimento</h2><p>Histórico de solicitações e respostas.</p></div><select aria-label="Filtrar chamados" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Todos os chamados</option><option value="OPEN">Em atendimento</option><option value="ANSWERED">Respondidos</option><option value="CLOSED">Encerrados</option></select></header>{tickets.length ? <div className="w-ticket-list">{tickets.map((ticket) => <details className="w-ticket" key={ticket.id}><summary><span className="w-ticket-icon"><MessageSquare size={19} /></span><div><strong>{ticket.subject}</strong><small>{date(ticket.createdAt)} · #{ticket.id.slice(-8)}</small></div><Status value={ticket.status} /><ChevronDown size={17} /></summary><div className="w-ticket-content"><div><span className="w-label">SUA MENSAGEM</span><p>{ticket.message}</p></div>{ticket.reply ? <div className="w-ticket-reply"><span className="w-label">RESPOSTA DA EQUIPE</span><p>{ticket.reply}</p></div> : <p className="w-ticket-awaiting"><Clock3 size={15} />Aguardando resposta da equipe.</p>}</div></details>)}</div> : <Empty icon={<LifeBuoy size={32} />} title="Nenhum chamado neste momento" detail={filter === 'all' ? 'Envie uma solicitação para a equipe. O histórico e as respostas ficarão disponíveis aqui.' : 'Não há chamados com este estado.'} />}</section>
    <section className="w-section w-new-ticket"><header className="w-section-heading"><div><h2>Abrir uma solicitação</h2><p>Descreva o que aconteceu e a ação esperada.</p></div><Mail size={20} /></header><form className="w-form" onSubmit={submit} ref={formRef}><label className="w-field">Assunto<input value={subject} required minLength={4} maxLength={120} onChange={(event) => setSubject(event.target.value)} placeholder="Ex.: dúvida sobre uma ativação" /></label><label className="w-field">Mensagem<textarea value={message} required minLength={10} maxLength={4000} rows={7} onChange={(event) => setMessage(event.target.value)} placeholder="Inclua a referência da operação, se houver." /><small>Não envie senhas, códigos temporários ou chaves secretas.</small></label><FormError message={error} /><SubmitButton busy={busy}>Enviar chamado <ArrowRight size={16} /></SubmitButton></form></section></motion.div>
    <motion.section className="w-section w-help-topics" variants={fadeUp}><header className="w-section-heading"><div><h2>Respostas rápidas</h2><p>Condições e estados do sistema, em linguagem direta.</p></div><CircleHelp size={20} /></header>{helpTopics.map((topic) => <details key={topic.title}><summary>{topic.title}<Plus size={17} /></summary><p>{topic.text}</p></details>)}</motion.section>
  </Page>;
}

function integrationIcon(id: string) {
  if (id === 'pool') return <Network size={25} />;
  if (id === 'os') return <SlidersHorizontal size={25} />;
  if (id === 'equipment' || id === 'telemetry') return <CircuitBoard size={25} />;
  if (id === 'quotes') return <Activity size={25} />;
  if (id === 'payments') return <Wallet size={25} />;
  return <Server size={25} />;
}

const integrationCategories: Record<string, string> = { FINANCE: 'Financeiro', MINING: 'Mineração', MARKET: 'Mercado', ECOSYSTEM: 'Ecossistema' };
const integrationData: Record<string, string> = {
  quotes: 'Pares disponíveis em USDT', payments: 'Consultar no extrato',
  telemetry: 'Consultar alocação vinculada', pool: 'Consultar fonte do pool',
  hosting: 'Consultar alocação de hosting', os: 'Consultar operação vinculada', equipment: 'Consultar catálogo operacional',
};

export function IntegrationsPage({ data }: WorkspacePageProps) {
  const connected = data.integrations.filter((item) => item.status === 'CONNECTED').length;
  const hardware = data.miners.filter((miner) => miner.allocatedHashrate !== null);
  return <Page><Heading section="INFRAESTRUTURA / 09" title="Ecossistema operacional" description="Hosting, pool e gestão de equipamentos, conectados à origem dos dados."><span className="w-count">{connected} / {data.integrations.length} integrações conectadas</span></Heading>
    <motion.section className="w-infrastructure-summary" variants={fadeUp}><div><span className="w-label">INFRAESTRUTURA VINCULADA</span><h2>{hardware.length ? `${hardware.length} alocações registradas` : 'Aguardando fontes operacionais'}</h2><p>{hardware.length ? 'As informações de cada alocação são apresentadas conforme os dados recebidos.' : 'Não há telemetria física disponível para esta conta. Ativações de ciclo não representam o estado de um ASIC.'}</p><Link to="/app/miners" className="w-text-link">Consultar suas máquinas <ArrowRight size={15} /></Link></div><div className="w-infrastructure-diagram" aria-hidden="true"><span><CircuitBoard size={28} /><small>EQUIPAMENTO</small></span><i /><span><Network size={28} /><small>POOL</small></span><i /><span><Activity size={28} /><small>DADOS</small></span></div></motion.section>
    <motion.div className="w-integration-grid" variants={fadeUp}>{data.integrations.length ? data.integrations.map((integration, index) => <section key={integration.id} className="w-integration-card"><header><span className="w-integration-symbol">{integrationIcon(integration.id)}</span><span className="w-integration-index">MÓDULO / {String(index + 1).padStart(2, '0')}</span><Status value={integration.status} /></header><div className="w-integration-content"><p className="w-label">{integrationCategories[integration.category] || integration.category}</p><h2>{integration.name}</h2><p>{integration.description}</p></div><dl><div><dt>Conexão</dt><dd>{statusNames[integration.status]}</dd></div><div><dt>Atualização · UTC</dt><dd>{integration.updatedAt ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(integration.updatedAt)) : 'Sem fonte configurada'}</dd></div><div><dt>Dados de operação</dt><dd>{integration.status === 'CONNECTED' ? integrationData[integration.id] || 'Consultar fonte vinculada' : 'Indisponíveis'}</dd></div></dl><Link to={`/app/support?subject=${encodeURIComponent(`Informações sobre ${integration.name}`)}`} className="button button-secondary">{integration.status === 'CONNECTED' ? 'Solicitar atendimento' : 'Consultar disponibilidade'}<ArrowUpRight size={16} /></Link></section>) : <section className="w-section"><Empty icon={<Server size={30} />} title="Nenhuma integração publicada" detail="A equipe operacional poderá informar a disponibilidade dos serviços." action={<Link to="/app/support" className="button button-secondary">Consultar suporte <ArrowRight size={15} /></Link>} /></section>}</motion.div>
    {hardware.length > 0 && <motion.section className="w-section" variants={fadeUp}><header className="w-section-heading"><div><h2>Alocações registradas</h2><p>Capacidade vinculada por contrato.</p></div><CircuitBoard size={20} /></header><div className="w-table-scroll"><table className="w-table"><thead><tr><th>Contrato</th><th>Equipamento</th><th>Hashrate alocado</th><th>Estado físico</th></tr></thead><tbody>{hardware.map((miner) => <tr key={miner.id}><td>{miner.planName}<small>{miner.id}</small></td><td>{miner.machine}</td><td>{number(miner.allocatedHashrate || 0, 2)} {miner.hashrateUnit}</td><td><Status value={miner.hardwareStatus} label={miner.hardwareStatus === 'ONLINE' ? 'Online confirmado' : miner.hardwareStatus === 'OFFLINE' ? 'Offline confirmado' : 'Dados indisponíveis'} /></td></tr>)}</tbody></table></div></motion.section>}
    <p className="w-section-note"><ShieldCheck size={16} />Um módulo configurado não comprova, sozinho, produção ou disponibilidade de equipamento. Consulte as fontes vinculadas à sua conta.</p>
  </Page>;
}

export function MarketPage({ data, refresh, notify }: WorkspacePageProps) {
  const [amount, setAmount] = useState('25,00');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [withdraw, setWithdraw] = useState<MarketPosition | null>(null);
  const [withdrawError, setWithdrawError] = useState('');
  const [positionUncertain, setPositionUncertain] = useState(false);
  const [withdrawalUncertain, setWithdrawalUncertain] = useState(false);
  const positionKey = useRef('');
  const withdrawalKey = useRef('');
  const canAct = enabled(data, 'market') || positionUncertain || withdrawalUncertain;
  const value = centsFromInput(amount);
  const deposit = data.wallets.find((wallet) => wallet.id === 'deposit');
  const live = data.marketPositions.filter((position) => position.status !== 'CLOSED');
  const principal = live.reduce((sum, position) => sum + position.principalCents, 0);
  const earnings = live.reduce((sum, position) => sum + position.earningsCents, 0);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!canAct) { setError('O Hashrate Market ainda não está liberado para dinheiro real.'); return; }
    if (value === null || value < 2500) { setError('A entrada mínima documentada é US$ 25,00.'); return; }
    if (!review && value > (deposit?.availableCents || 0)) { setError('Saldo para compra insuficiente. Consulte sua carteira de depósitos.'); return; }
    if (!review) { positionKey.current = crypto.randomUUID(); setReview(true); return; }
    setBusy(true);
    let recorded = false;
    try { await post('/market/positions', { amountCents: value, idempotencyKey: positionKey.current }); recorded = true; setReview(false); setAmount('25,00'); setPositionUncertain(false); positionKey.current = ''; await refresh(); notify(data.mode === 'demo' ? 'Posição simulada criada no Hashrate Market.' : 'Posição registrada no Hashrate Market.', 'success'); }
    catch (failure) { if (recorded) notify('Posição registrada. Atualize a página para consultar os dados mais recentes.', 'info'); else { setPositionUncertain((previous) => previous || !(failure instanceof ApiError) || failure.status >= 500); setError(errorMessage(failure)); } } finally { setBusy(false); }
  }
  async function requestWithdrawal(event: FormEvent) {
    event.preventDefault(); if (!withdraw) return; setBusy(true); setWithdrawError('');
    let recorded = false;
    try { await post(`/market/positions/${encodeURIComponent(withdraw.id)}/withdraw`, { idempotencyKey: withdrawalKey.current }); recorded = true; setWithdraw(null); setWithdrawalUncertain(false); withdrawalKey.current = ''; await refresh(); notify(data.mode === 'demo' ? 'Retirada simulada registrada.' : 'Solicitação de retirada registrada.', 'success'); }
    catch (failure) { if (recorded) notify('Retirada registrada. Atualize a página para consultar os dados mais recentes.', 'info'); else { setWithdrawalUncertain((previous) => previous || !(failure instanceof ApiError) || failure.status >= 500); setWithdrawError(errorMessage(failure)); } } finally { setBusy(false); }
  }
  return <Page><Heading section="HASHRATE / MARKET" title="Capacidade em movimento" description="Acompanhe o principal e o resultado das suas posições em uma visão própria."><Status value={canAct ? data.mode === 'demo' ? 'PROPOSAL' : 'CONFIRMED' : 'PENDING'} label={data.mode === 'demo' ? 'Simulação disponível' : canAct ? 'Operação liberada' : 'Em preparação'} /></Heading>
    <motion.div className="w-market-layout" variants={fadeUp}><section className="w-market-terminal"><p className="w-label">AMNG / HASHRATE MARKET</p><h2>Uma posição.<br /><span>Uma visão clara.</span></h2><p className="w-market-intro">Principal, resultado e retirada registrados separadamente. Disponibilidade e liquidação seguem as condições aprovadas.</p><div className="w-market-doc"><div><span>Entrada mínima documentada</span><strong>{money(2500)}</strong></div><div><span>Taxa diária documentada</span><strong>{percent(40)}</strong></div></div><p className="w-market-source">Fonte: escopo da plataforma. Base de cálculo, funding e retirada ainda precisam de validação. A taxa documentada não garante resultado.</p><div className="w-market-stats"><div><span>Principal em posições</span><strong>{money(principal)}</strong></div><div><span>Resultado registrado</span><strong>{money(earnings)}</strong></div><div><span>Posições em aberto</span><strong>{number(live.length)}</strong></div></div></section>
    <section className="w-section w-market-form"><header className="w-section-heading"><div><h2>Abrir uma posição</h2><p>Origem: carteira de depósitos.</p></div><Gauge size={22} /></header>{canAct ? <><RuleNotice demo={data.mode === 'demo'} rule={ruleFor(data, 'market')} /><form className="w-form" onSubmit={submit}><label className="w-field">Valor em USD<div className="w-amount-input"><span>US$</span><input inputMode="decimal" value={amount} disabled={review || busy} required onChange={(event) => setAmount(event.target.value)} aria-describedby="market-amount-help" /></div><small id="market-amount-help">Saldo livre para compra: {money(deposit?.availableCents || 0)}</small></label>{!review && <div className="w-amount-presets" aria-label="Valores sugeridos">{[25, 100, 250].map((preset) => <button type="button" key={preset} onClick={() => setAmount(`${preset},00`)}>{money(preset * 100)}</button>)}</div>}{review && value !== null && <div className="w-review"><p className="w-label">REVISÃO DA POSIÇÃO</p><div><span>Principal</span><strong>{money(value)}</strong></div><div><span>Origem</span><b>Depósitos</b></div><p>{data.mode === 'demo' ? 'Simulação do comportamento do produto, sem investimento real.' : 'A aplicação seguirá a versão vigente dos termos e regras.'}</p></div>}<FormError message={error} />{positionUncertain && <p className="w-uncertain-note" role="status">Verifique a posição com a mesma referência antes de iniciar outra.</p>}<SubmitButton busy={busy}>{positionUncertain ? 'Verificar posição' : review ? 'Confirmar posição' : 'Revisar posição'}<ArrowRight size={16} /></SubmitButton>{review && <button type="button" className="button button-ghost" disabled={busy || positionUncertain} onClick={() => setReview(false)}>Editar valor</button>}<Link to="/app/wallets" className="w-text-link">Consultar carteiras <ArrowRight size={14} /></Link></form></> : <RuleNotice rule={ruleFor(data, 'market')} title="Novas posições em preparação" />}</section></motion.div>
    <motion.section className="w-section" variants={fadeUp}><header className="w-section-heading"><div><h2>Suas posições</h2><p>O estado da retirada é separado do resultado registrado.</p></div><span className="w-count">{data.marketPositions.length} posições</span></header>{data.marketPositions.length ? <div className="w-table-scroll" tabIndex={0} aria-label="Posições do Hashrate Market. Role horizontalmente para mais colunas."><table className="w-table"><thead><tr><th>Posição / entrada</th><th>Principal</th><th>Resultado</th><th>Estado</th><th className="w-align-right">Ação</th></tr></thead><tbody>{data.marketPositions.map((position) => <tr key={position.id}><td><strong>#{position.id.slice(-8)}</strong><small>{date(position.createdAt)}</small></td><td>{money(position.principalCents)}</td><td className="w-amount is-positive">{money(position.earningsCents)}</td><td><Status value={position.status} /></td><td className="w-align-right">{position.status === 'ACTIVE' ? <button type="button" className="button button-secondary w-small-button" disabled={!canAct || busy} onClick={() => { withdrawalKey.current = crypto.randomUUID(); setWithdraw(position); setWithdrawError(''); }}>Solicitar retirada <ArrowUpRight size={14} /></button> : <span className="w-muted">{position.status === 'CLOSED' ? 'Finalizada' : 'Em processamento'}</span>}</td></tr>)}</tbody></table></div> : <Empty icon={<Gauge size={30} />} title="Nenhuma posição registrada" detail={canAct ? 'Revise as condições e o valor no formulário para abrir sua primeira posição.' : 'As posições aparecerão após a liberação operacional do produto.'} />}</motion.section>
    {withdraw && <Dialog title="Revisar retirada" canClose={!busy && !withdrawalUncertain} onClose={() => { if (!busy && !withdrawalUncertain) setWithdraw(null); }}><form className="w-form" onSubmit={requestWithdrawal}><p className="w-muted">Posição #{withdraw.id.slice(-8)}. A solicitação será verificada no servidor.</p><dl className="w-detail-list"><div><dt>Principal registrado</dt><dd>{money(withdraw.principalCents)}</dd></div><div><dt>Resultado registrado</dt><dd>{money(withdraw.earningsCents)}</dd></div><div><dt>Soma dos registros</dt><dd>{money(withdraw.principalCents + withdraw.earningsCents)}</dd></div></dl><RuleNotice demo={data.mode === 'demo'} rule={ruleFor(data, 'market')} title="Condições de liquidação" /><FormError message={withdrawError} />{withdrawalUncertain && <p className="w-uncertain-note" role="status">A resposta ficou indisponível. Verifique a solicitação com a mesma referência.</p>}<SubmitButton busy={busy}>{withdrawalUncertain ? 'Verificar retirada' : 'Confirmar solicitação'} <ArrowUpRight size={16} /></SubmitButton><button type="button" className="button button-ghost" disabled={busy || withdrawalUncertain} onClick={() => setWithdraw(null)}>Cancelar</button></form></Dialog>}
  </Page>;
}

export function CyclesPage({ data }: WorkspacePageProps) {
  return <Page><Heading section="PRODUTOS / CICLOS" title="Novos ciclos, no horizonte" description="Durações documentadas para a próxima família de produtos da operação."><Status value={ruleFor(data, 'cycles')?.enabled ? 'CONFIRMED' : 'PENDING'} label={ruleFor(data, 'cycles')?.enabled ? 'Consulte disponibilidade' : 'Em preparação'} /></Heading>
    <motion.div className="w-cycle-intro" variants={fadeUp}><div><p className="w-label">JANELAS DE LANÇAMENTO PROPOSTAS</p><h2>Segundas<br /><span>& quartas.</span></h2><p>Calendário, fuso, capacidade e condições de liquidação ainda dependem de confirmação operacional.</p><Link to="/app/support?subject=Disponibilidade%20dos%20ciclos" className="w-text-link">Consultar próximos lançamentos <ArrowRight size={16} /></Link></div><div className="w-cycle-calendar" aria-label="Segunda e quarta são janelas propostas. Demais dias não têm calendário documentado.">{['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map((day, index) => <div key={day} className={index === 0 || index === 2 ? 'is-proposed' : ''}><span>{day}</span>{index === 0 || index === 2 ? <span className="w-calendar-mark"><Timer size={22} /><small>Proposto</small></span> : <span className="w-calendar-dash">—</span>}</div>)}</div></motion.div>
    <motion.section className="w-section" variants={fadeUp}><header className="w-section-heading"><div><h2>Durações & condições</h2><p>Valores do escopo; taxas e contratação ainda precisam de aprovação.</p></div><Clock3 size={20} /></header><div className="w-cycle-offers">{data.cycles.map((offer, index) => <div className="w-cycle-offer" key={offer.id}><span className="w-cycle-number">{String(index + 1).padStart(2, '0')}</span><div className="w-cycle-duration"><strong>{offer.days}<small>DIAS</small></strong><span>{offer.name}</span></div><div className="w-cycle-rail"><span style={{ width: `${Math.max(8, offer.days / 90 * 100)}%` }} /></div><div className="w-cycle-price"><span>Valor documentado</span><strong>{money(offer.priceCents)}</strong></div><div className="w-cycle-rate"><span>Taxa</span><strong>{offer.rateBps === null ? 'A definir' : percent(offer.rateBps)}</strong><small>{offer.coin || 'Moeda a confirmar'}</small></div><Status value={offer.status} label={offer.status === 'APPROVED' ? 'Aprovado' : 'Em preparação'} /><Link className="w-cycle-link" to={`/app/support?subject=${encodeURIComponent(`Condições do ciclo de ${offer.days} dias`)}`} aria-label={`Consultar condições do ciclo de ${offer.days} dias`}><ArrowUpRight size={21} /></Link></div>)}</div>{!data.cycles.length && <Empty icon={<Timer size={28} />} title="Nenhum ciclo publicado" detail="A equipe operacional poderá informar o calendário e as condições dos próximos produtos." />}</motion.section>
    <motion.div className="w-cycle-footer" variants={fadeUp}><section className="w-section w-special-coins"><p className="w-label">FAMÍLIAS EM ESTUDO</p><h2>Dash & Kaspa</h2><p>Moedas citadas no escopo para capacidades especiais. Equipamento, algoritmo e disponibilidade precisam de validação.</p><span className="w-coin-tags"><b>DASH</b><b>KAS</b></span></section><section className="w-section"><RuleNotice rule={ruleFor(data, 'cycles')} title="Condições antes da contratação" /><p className="w-cycle-conditions">Abertura, taxa, calendário, estoque, elegibilidade e liquidação precisam estar aprovados juntos. Não há cálculo de retorno enquanto a taxa estiver a definir.</p><Link className="button button-secondary" to="/app/support?subject=Condições%20dos%20ciclos">Consultar a operação <ArrowRight size={16} /></Link></section></motion.div>
  </Page>;
}




