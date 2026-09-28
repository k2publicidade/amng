import { Fragment, forwardRef, useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, CalendarDays, ChevronDown, ChevronLeft, ChevronRight,
  Download, FileText, LoaderCircle, RefreshCw, Search, ShieldCheck, SlidersHorizontal, X,
} from 'lucide-react';
import type { LedgerEntry, WalletId } from '../../shared/types';
import type { LedgerFilters, LedgerProduct, WalletStatementData, WalletStatementEntry } from '../../shared/ledger-types';
import { api, ApiError } from '../lib/api';
import { money, number, percent } from '../lib/format';
import './wallet-statement.css';

interface WalletStatementProps {
  wallet: WalletId | 'all';
  onWalletChange: (wallet: WalletId | 'all') => void;
  refreshToken: string;
  isDemo: boolean;
}
type Phase = 'loading' | 'ready' | 'error' | 'cancelled';
type DraftFilters = {
  kind: string; status: LedgerEntry['status'] | 'all'; product: LedgerProduct | 'all';
  contractId: string; coin: string; from: string; to: string; search: string;
};
const emptyDraft: DraftFilters = { kind: 'all', status: 'all', product: 'all', contractId: 'all', coin: 'all', from: '', to: '', search: '' };
const walletNames: Record<WalletId, string> = { deposit: 'Depósitos', earnings: 'Rendimentos', affiliate: 'Afiliados' };
const statuses: Record<LedgerEntry['status'], string> = { CONFIRMED: 'Confirmado', PENDING: 'Pendente', RESERVED: 'Reservado', REVERSED: 'Estornado' };
const products: Record<LedgerProduct, string> = { cloud: 'Cloud Mining', market: 'Hashrate Market', affiliate: 'Comissões de rede', career: 'Carreira', wallet: 'Carteiras' };
const kinds: Record<string, string> = {
  DEPOSIT: 'Depósito', DEMO_DEPOSIT: 'Depósito simulado', PURCHASE: 'Contratação', CLOUD_PURCHASE: 'Contratação Cloud',
  DEMO_AFFILIATE_FIXTURE: 'Comissão simulada', MINING_INCOME: 'Produção de mineração', MINING: 'Produção de mineração',
  PROFIT_SHARING: 'Participação em resultados', COMMISSION: 'Comissão', AFFILIATE: 'Comissão de rede',
  AFFILIATE_COMMISSION: 'Comissão de rede', AFFILIATE_REVERSAL: 'Estorno de comissão',
  WITHDRAWAL: 'Saque', WITHDRAWAL_RESERVE: 'Reserva de saque', WITHDRAWAL_RESERVED: 'Reserva de saque', WITHDRAWAL_REFUND: 'Devolução de reserva',
  CONVERSION: 'Conversão', CONVERSION_OUT: 'Conversão · saída', CONVERSION_IN: 'Conversão · crédito',
  MARKET_ENTRY: 'Entrada no Market', MARKET_WITHDRAWAL: 'Retirada do Market', MARKET_EARNINGS: 'Resultado do Market',
  MARKET_PRINCIPAL_RETURN: 'Retorno de principal', SALARY: 'Salário', BONUS: 'Bônus', CAREER_SALARY: 'Salário de carreira', CAREER_BONUS: 'Bônus de carreira',
};
const kindLabel = (kind: string) => kinds[kind] || kind.replaceAll('_', ' ');
const utcDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value));
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível consultar o extrato.';

function filtersFor(draft: DraftFilters, wallet: WalletStatementProps['wallet']): LedgerFilters {
  return {
    ...(wallet !== 'all' ? { wallet } : {}),
    ...(draft.kind !== 'all' ? { kind: draft.kind } : {}),
    ...(draft.status !== 'all' ? { status: draft.status } : {}),
    ...(draft.product !== 'all' ? { product: draft.product } : {}),
    ...(draft.contractId !== 'all' ? { contractId: draft.contractId } : {}),
    ...(draft.coin !== 'all' ? { coin: draft.coin } : {}),
    ...(draft.from ? { from: draft.from } : {}), ...(draft.to ? { to: draft.to } : {}),
    ...(draft.search.trim() ? { search: draft.search.trim() } : {}),
  };
}
function queryString(filters: LedgerFilters, page?: number, pageSize?: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  if (page !== undefined) params.set('page', String(page));
  if (pageSize !== undefined) params.set('pageSize', String(pageSize));
  return params.toString();
}

function StatementRow({ entry, expanded, onToggle }: { entry: WalletStatementEntry; expanded: boolean; onToggle: () => void }) {
  const detailsId = useId();
  const positive = entry.amountCents >= 0;
  return <Fragment>
    <tr>
      <td><div className="ws-movement"><span className={`ws-direction ${positive ? 'is-credit' : 'is-debit'}`} aria-hidden="true">{positive ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span><span><strong>{kindLabel(entry.kind)}</strong><small>{utcDate(entry.createdAt)} · UTC</small><span className="ws-mobile-meta">{walletNames[entry.wallet]} · {statuses[entry.status]}</span></span></div></td>
      <td className="ws-wallet-cell">{walletNames[entry.wallet]}</td>
      <td className="ws-status-cell"><span className={`ws-status ws-status--${entry.status.toLowerCase()}`}>{statuses[entry.status]}</span></td>
      <td className={`ws-amount ${positive ? 'is-credit' : ''}`}>{positive ? '+' : '−'}{money(Math.abs(entry.amountCents))}</td>
      <td className="ws-toggle-cell"><button type="button" className="ws-icon-button" onClick={onToggle} aria-expanded={expanded} aria-controls={detailsId} aria-label={`${expanded ? 'Fechar' : 'Abrir'} detalhes de ${kindLabel(entry.kind)}, ${money(Math.abs(entry.amountCents))}`}>{expanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}</button></td>
    </tr>
    {expanded && <tr className="ws-detail-row"><td colSpan={5}><div id={detailsId} className="ws-detail">
      <p>{entry.description}</p>
      <dl>
        <div><dt>Origem</dt><dd>{products[entry.product]}</dd></div>
        <div><dt>Carteira / estado atual</dt><dd>{walletNames[entry.wallet]} · {statuses[entry.status]}</dd></div>
        <div><dt>Ambiente</dt><dd>{entry.isDemo ? 'Demonstração · saldo simulado' : 'Conta real'}</dd></div>
        <div><dt>Referência</dt><dd className="ws-reference">{entry.reference}</dd></div>
        <div><dt>Identificador do movimento</dt><dd className="ws-reference">{entry.id}</dd></div>
        <div><dt>Data de origem · UTC</dt><dd>{entry.createdAt}</dd></div>
        {entry.storedStatus !== entry.status && <div><dt>Estado na origem</dt><dd>{statuses[entry.storedStatus]} · o estado atual acompanha a conciliação.</dd></div>}
      </dl>
      {entry.contract && <div className="ws-origin-card"><header><span>CONTRATO VINCULADO</span><strong>{entry.contract.name} · {entry.contract.coin}</strong></header><dl>
        <div><dt>Equipamento contratado</dt><dd>{entry.contract.machine}</dd></div>
        <div><dt>Base do contrato</dt><dd>{money(entry.contract.principalCents)}</dd></div>
        <div><dt>Taxa registrada</dt><dd>{percent(entry.contract.rateBps)} ao dia{entry.isDemo ? ' · simulação' : ''}</dd></div>
        <div><dt>Versão de origem</dt><dd>Plano {entry.contract.planVersion ?? 'indisponível'} · termos {entry.contract.termsVersion ?? 'indisponíveis'}</dd></div>
      </dl></div>}
      {entry.payment && <div className="ws-origin-card"><header><span>PAGAMENTO VINCULADO</span><strong>{({ CONFIRMED: 'Confirmado', PENDING: 'Pendente', PROCESSING: 'Em processamento', REVIEW_REQUIRED: 'Em conciliação', PAID: 'Pago', REJECTED: 'Recusado' } as Record<string, string>)[entry.payment.status] || entry.payment.status}</strong></header><dl>
        <div><dt>Valor bruto</dt><dd>{money(entry.payment.grossCents)}</dd></div><div><dt>Tarifa registrada</dt><dd>{money(entry.payment.feeCents)}</dd></div><div><dt>Valor líquido</dt><dd>{money(entry.payment.netCents)}</dd></div>
      </dl></div>}
    </div></td></tr>}
  </Fragment>;
}

export const WalletStatement = forwardRef<HTMLElement, WalletStatementProps>(function WalletStatement({ wallet, onWalletChange, refreshToken, isDemo }, ref) {
  const titleId = useId();
  const [draft, setDraft] = useState<DraftFilters>(emptyDraft);
  const [applied, setApplied] = useState<DraftFilters>(emptyDraft);
  const [advanced, setAdvanced] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [revision, setRevision] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [report, setReport] = useState<WalletStatementData | null>(null);
  const [options, setOptions] = useState<WalletStatementData['options']>({ kinds: [], contracts: [], coins: [] });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [exportState, setExportState] = useState<'idle' | 'preparing' | 'cancelled'>('idle');
  const [exportError, setExportError] = useState('');
  const [exportNotice, setExportNotice] = useState('');
  const [validation, setValidation] = useState('');
  const requestRef = useRef<AbortController | null>(null);
  const exportRef = useRef<AbortController | null>(null);
  const oldWallet = useRef(wallet);
  const sequence = useRef(0);
  const activeFilters = filtersFor(applied, wallet);
  const filtersKey = queryString(activeFilters);
  const draftChanged = JSON.stringify(draft) !== JSON.stringify(applied);
  const hasFilters = Boolean(filtersKey);

  useEffect(() => {
    if (oldWallet.current !== wallet) {
      oldWallet.current = wallet;
      if (page !== 1) { setPage(1); return; }
    }
    const controller = new AbortController();
    const current = ++sequence.current;
    requestRef.current = controller;
    setPhase('loading'); setError(''); setExpanded(null);
    api<WalletStatementData>(`/wallets/statement?${queryString(filtersFor(applied, wallet), page, pageSize)}`, { signal: controller.signal })
      .then(data => {
        if (controller.signal.aborted || sequence.current !== current) return;
        setReport(data); setOptions(data.options); setPhase('ready');
      }).catch(failure => {
        if (controller.signal.aborted || sequence.current !== current) return;
        setError(errorMessage(failure)); setPhase('error');
      }).finally(() => { if (requestRef.current === controller) requestRef.current = null; });
    return () => { controller.abort(); };
  }, [filtersKey, page, pageSize, revision, refreshToken]);
  useEffect(() => {
    exportRef.current?.abort(); setExportError(''); setExportNotice('');
  }, [filtersKey]);
  useEffect(() => () => { exportRef.current?.abort(); }, []);

  function update<K extends keyof DraftFilters>(key: K, value: DraftFilters[K]) { setDraft(previous => ({ ...previous, [key]: value })); setValidation(''); }
  function applyFilters(event: FormEvent) {
    event.preventDefault();
    if (draft.from && draft.to && draft.from > draft.to) { setValidation('A data final deve ser igual ou posterior à inicial.'); return; }
    const filters = { ...draft, search: draft.search.trim() };
    setDraft(filters); setApplied(filters); setPage(1); setRevision(value => value + 1);
    setExportError(''); setExportNotice('');
  }
  function clearFilters() {
    setDraft(emptyDraft); setApplied(emptyDraft); onWalletChange('all'); setPage(1); setValidation('');
    setExportError(''); setExportNotice(''); setRevision(value => value + 1);
  }
  function cancelRequest() { requestRef.current?.abort(); setPhase('cancelled'); }
  async function exportStatement() {
    if (exportRef.current) return;
    const controller = new AbortController(); exportRef.current = controller;
    setExportState('preparing'); setExportError(''); setExportNotice('');
    try {
      const response = await fetch(`/api/wallets/statement/export?${filtersKey}`, { credentials: 'same-origin', signal: controller.signal, headers: { Accept: 'text/csv' } });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        throw new ApiError(failure.error || 'Não foi possível preparar o arquivo.', response.status, failure.code);
      }
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `AMNG-extrato${isDemo ? '-demonstracao' : ''}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
      const rowHeader = response.headers.get('X-Export-Row-Count');
      const rows = Number(rowHeader);
      setExportNotice(rowHeader !== null && Number.isSafeInteger(rows) && rows >= 0 ? `Arquivo completo preparado: ${number(rows)} registros dos filtros aplicados.` : 'Arquivo completo preparado com os filtros aplicados.');
      setExportState('idle');
    } catch (failure) {
      if (controller.signal.aborted) setExportState('cancelled');
      else { setExportError(errorMessage(failure)); setExportState('idle'); }
    } finally { if (exportRef.current === controller) exportRef.current = null; }
  }

  const pagination = report?.pagination;
  const first = pagination && pagination.totalEntries ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const last = pagination ? Math.min(pagination.page * pagination.pageSize, pagination.totalEntries) : 0;
  const activeFilterLabels = [
    activeFilters.wallet && walletNames[activeFilters.wallet], activeFilters.product && products[activeFilters.product],
    activeFilters.status && statuses[activeFilters.status], activeFilters.kind && kindLabel(activeFilters.kind),
    activeFilters.contractId && `Contrato #${activeFilters.contractId.slice(-8)}`, activeFilters.coin,
    (activeFilters.from || activeFilters.to) && `${activeFilters.from || 'Início'} → ${activeFilters.to || 'Sem data final'} · UTC`,
    activeFilters.search && `Busca: ${activeFilters.search}`,
  ].filter(Boolean);

  return <section ref={ref} className="w-section ws-statement" tabIndex={-1} aria-labelledby={titleId}>
    <header className="ws-heading"><div><span className="w-label">HISTÓRICO FINANCEIRO / USD</span><h2 id={titleId}>Livro de movimentos</h2><p>Consulte toda a trajetória do seu saldo.</p></div><div className="ws-heading-actions"><button type="button" className="ws-icon-button" aria-label="Atualizar extrato" onClick={() => setRevision(value => value + 1)} disabled={phase === 'loading'}><RefreshCw size={17} /></button><button type="button" className="button button-secondary ws-export" onClick={exportStatement} disabled={exportState === 'preparing' || phase !== 'ready' || !report?.pagination.totalEntries}><Download size={16} />{exportState === 'preparing' ? 'Preparando…' : 'Exportar CSV'}</button></div></header>
    <form className="ws-filters" onSubmit={applyFilters}>
      <div className="ws-filter-main"><label className="ws-search"><Search size={17} aria-hidden="true" /><input type="search" maxLength={120} value={draft.search} onChange={event => update('search', event.target.value)} aria-label="Buscar descrição ou referência no extrato" placeholder="Descrição ou referência" /></label><label className="ws-field"><span>Carteira</span><select value={wallet} onChange={event => onWalletChange(event.target.value as WalletStatementProps['wallet'])}><option value="all">Todas as carteiras</option>{Object.entries(walletNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="button" className={`ws-filter-toggle ${advanced ? 'is-open' : ''}`} aria-expanded={advanced} aria-controls={`${titleId}-filters`} onClick={() => setAdvanced(value => !value)}><SlidersHorizontal size={17} /><span>Filtros</span><ChevronDown size={14} /></button></div>
      {advanced && <div id={`${titleId}-filters`} className="ws-filter-grid">
        <label className="ws-field"><span>Estado atual</span><select value={draft.status} onChange={event => update('status', event.target.value as DraftFilters['status'])}><option value="all">Todos os estados</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="ws-field"><span>Tipo de movimento</span><select value={draft.kind} onChange={event => update('kind', event.target.value)}><option value="all">Todos os tipos</option>{options.kinds.map(kind => <option key={kind} value={kind}>{kindLabel(kind)}</option>)}</select></label>
        <label className="ws-field"><span>Produto</span><select value={draft.product} onChange={event => update('product', event.target.value as DraftFilters['product'])}><option value="all">Todos os produtos</option>{Object.entries(products).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="ws-field"><span>Seu contrato</span><select value={draft.contractId} onChange={event => update('contractId', event.target.value)}><option value="all">Todos os seus contratos</option>{options.contracts.map(contract => <option key={contract.id} value={contract.id}>{contract.label} · #{contract.id.slice(-8)}</option>)}</select></label>
        <label className="ws-field"><span>Moeda do contrato</span><select value={draft.coin} onChange={event => update('coin', event.target.value)}><option value="all">Todas as moedas</option>{options.coins.map(coin => <option key={coin} value={coin}>{coin}</option>)}</select><small>Os valores do saldo permanecem em USD.</small></label>
        <div className="ws-date-range"><label className="ws-field"><span>De · UTC</span><input type="date" value={draft.from} max={draft.to || undefined} onChange={event => update('from', event.target.value)} /></label><label className="ws-field"><span>Até · UTC</span><input type="date" value={draft.to} min={draft.from || undefined} onChange={event => update('to', event.target.value)} /></label></div>
      </div>}
      <div className="ws-filter-footer"><span>{draftChanged ? 'Alterações de filtro aguardando aplicação.' : 'Período e horários em UTC.'}</span><div>{hasFilters && <button type="button" className="ws-clear" onClick={clearFilters}>Limpar</button>}<button type="submit" className="ws-apply"><Search size={14} />Aplicar filtros</button></div></div>
      {validation && <p className="ws-error-inline" role="alert">{validation}</p>}
    </form>
    {activeFilterLabels.length > 0 && <div className="ws-active-filters" aria-label="Filtros aplicados">{activeFilterLabels.map((label, index) => <span key={index}>{label}</span>)}</div>}
    {isDemo && <p className="ws-demo-note"><ShieldCheck size={15} />Demonstração privada · os movimentos não representam dinheiro real.</p>}
    <div className="ws-report" aria-busy={phase === 'loading'}>
      {phase === 'loading' && <div className="ws-state ws-state--loading" role="status"><LoaderCircle size={24} className="ws-spin" /><h3>Consultando seus movimentos</h3><p>Preparando os registros e totais deste filtro.</p><button type="button" className="ws-text-action" onClick={cancelRequest}><X size={14} />Cancelar consulta</button></div>}
      {phase === 'error' && <div className="ws-state" role="alert"><FileText size={27} /><h3>Extrato indisponível neste momento</h3><p>{error}</p><button type="button" className="button button-secondary" onClick={() => setRevision(value => value + 1)}><RefreshCw size={15} />Tentar novamente</button></div>}
      {phase === 'cancelled' && <div className="ws-state" role="status"><FileText size={27} /><h3>Consulta cancelada</h3><p>Seus movimentos permanecem registrados.</p><button type="button" className="button button-secondary" onClick={() => setRevision(value => value + 1)}><RefreshCw size={15} />Retomar consulta</button></div>}
      {phase === 'ready' && report && <>
        <div className="ws-totals" aria-label="Totais de todos os movimentos dos filtros aplicados"><div><span>Entradas no filtro</span><strong className="is-credit">+{money(report.totals.creditsCents)}</strong></div><div><span>Saídas no filtro</span><strong>−{money(report.totals.debitsCents)}</strong></div><div><span>Variação no filtro</span><strong>{report.totals.netCents < 0 ? '−' : '+'}{money(Math.abs(report.totals.netCents))}</strong></div></div>
        <p className="ws-total-note">Totais de {number(report.pagination.totalEntries)} registros. A variação mostra os movimentos do filtro; os saldos atuais estão nas carteiras acima.</p>
        {report.entries.length ? <div className="ws-table-scroll"><table className="ws-table"><caption className="ws-sr-only">Movimentos do extrato com valores em USD e horários UTC.</caption><thead><tr><th scope="col">Movimento / data</th><th scope="col" className="ws-wallet-cell">Carteira</th><th scope="col" className="ws-status-cell">Estado</th><th scope="col" className="ws-amount">Valor · USD</th><th scope="col"><span className="ws-sr-only">Detalhes</span></th></tr></thead><tbody>{report.entries.map(entry => <StatementRow key={entry.id} entry={entry} expanded={expanded === entry.id} onToggle={() => setExpanded(value => value === entry.id ? null : entry.id)} />)}</tbody></table></div> : <div className="ws-state"><CalendarDays size={28} /><h3>Nenhum movimento neste filtro</h3><p>{hasFilters ? 'Ajuste o período ou os filtros para consultar outros registros.' : 'Os movimentos aparecerão após uma operação registrada na sua conta.'}</p>{hasFilters && <button type="button" className="button button-secondary" onClick={clearFilters}>Limpar filtros</button>}</div>}
        {pagination && pagination.totalEntries > 0 && <footer className="ws-pagination"><span>{number(first)}–{number(last)} de {number(pagination.totalEntries)}</span><label>Por página<select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }} aria-label="Registros por página do extrato">{[12, 20, 50, 100].map(value => <option key={value} value={value}>{value}</option>)}</select></label><nav aria-label="Páginas do extrato"><button type="button" className="ws-icon-button" onClick={() => setPage(pagination.page - 1)} disabled={pagination.page === 1} aria-label="Página anterior do extrato"><ChevronLeft size={17} /></button><span aria-live="polite">{pagination.page} / {number(pagination.totalPages)}</span><button type="button" className="ws-icon-button" onClick={() => setPage(pagination.page + 1)} disabled={pagination.page === pagination.totalPages} aria-label="Próxima página do extrato"><ChevronRight size={17} /></button></nav></footer>}
        <p className="ws-generated">Consulta gerada em {utcDate(report.generatedAt)} · UTC</p>
      </>}
    </div>
    {(exportState === 'preparing' || exportState === 'cancelled' || exportError || exportNotice) && <div className={`ws-export-status ${exportError ? 'has-error' : ''}`} role={exportError ? 'alert' : 'status'}>{exportState === 'preparing' ? <><LoaderCircle size={16} className="ws-spin" /><span>Preparando arquivo completo com os filtros aplicados…</span><button type="button" onClick={() => exportRef.current?.abort()}>Cancelar</button></> : <><FileText size={16} /><span>{exportError || exportNotice || 'Exportação cancelada.'}</span>{exportError && <button type="button" onClick={exportStatement}>Tentar novamente</button>}</>}</div>}
    <p className="ws-export-limit"><Download size={13} />O CSV inclui todos os registros do filtro, até {number(report?.exportMaxRows ?? 100_000)} por arquivo. Períodos maiores precisam ser divididos.</p>
  </section>;
});
