import type { CommissionEvent, CommissionFilters, CommissionStatementData, CommissionStatementRequest, CommissionStatus } from '../shared/commission-types.ts';
import type { Database, Executor, Row, SqlValue } from './database.ts';
import { COMMISSIONS } from './catalog.ts';
import { DomainError, iso, reject } from './domain.ts';
import { safeCsvText } from './ledger-queries.ts';

export const COMMISSION_EXPORT_MAX_ROWS = 10_000;
const EXPORT_BATCH_SIZE = 500;
const integer = (value: unknown) => {
  const result = Number(value ?? 0);
  if (!Number.isSafeInteger(result)) throw new Error('Unsafe commission statement integer');
  return result;
};
const reference = (value: string) => '#' + value.slice(-8).toUpperCase();
function object(value: unknown): Record<string, unknown> {
  const parsed: unknown = JSON.parse(String(value));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid commission statement snapshot');
  return parsed as Record<string, unknown>;
}
function expressions(db: Database) {
  const first = db.dialect === 'sqlite' ? "json_extract(a.snapshot,'$.firstPurchase')" : "a.snapshot::jsonb->>'firstPurchase'";
  const purchase = db.dialect === 'sqlite'
    ? `CASE WHEN ${first}=1 THEN 'first' WHEN ${first}=0 THEN 'repeat' ELSE 'unknown' END`
    : `CASE WHEN ${first}='true' THEN 'first' WHEN ${first}='false' THEN 'repeat' ELSE 'unknown' END`;
  return {
    purchase,
    status: "CASE WHEN x.id IS NOT NULL OR debit.id IS NOT NULL THEN 'REVERSED' WHEN a.status IN ('CONFIRMED','INELIGIBLE','PENDING_RATE') THEN a.status ELSE 'UNAVAILABLE' END",
    eligibility: "CASE WHEN a.status='CONFIRMED' THEN 'eligible' WHEN a.status='INELIGIBLE' THEN 'ineligible' ELSE 'unknown' END",
  };
}
const relations = `FROM affiliate_commissions a
  JOIN contracts c ON c.id=a.contract_id AND c.scope=a.scope AND c.user_id=a.buyer_id
  LEFT JOIN commission_reversals x ON x.commission_id=a.id
  LEFT JOIN ledger_entries credit ON credit.user_id=a.recipient_id AND credit.scope=a.scope AND credit.is_demo=c.is_demo
    AND credit.business_key=c.id||':commission:'||CAST(a.level AS TEXT) AND credit.kind='AFFILIATE_COMMISSION' AND credit.status='CONFIRMED'
  LEFT JOIN ledger_entries debit ON debit.user_id=a.recipient_id AND debit.scope=a.scope AND debit.is_demo=c.is_demo
    AND debit.business_key=a.id||':reversal' AND debit.kind='AFFILIATE_REVERSAL' AND debit.status='CONFIRMED'`;
function selection(db: Database) {
  const expression = expressions(db);
  return `SELECT a.id,a.level,a.rate_bps,a.base_cents,a.amount_cents,a.status,a.snapshot,a.created_at,
    c.id AS contract_id,c.plan_id,c.snapshot AS contract_snapshot,c.is_demo,
    x.id AS reversal_id,x.created_at AS reversal_at,
    credit.id AS credit_id,credit.amount_cents AS credited,credit.created_at AS credit_at,
    debit.id AS debit_id,debit.amount_cents AS debited,debit.created_at AS debit_at,
    ${expression.purchase} AS purchase,${expression.status} AS effective_status,${expression.eligibility} AS eligibility ${relations}`;
}
function condition(db: Database, user: Row, filters: CommissionFilters) {
  const expression = expressions(db);
  const clauses = ['a.recipient_id=?', 'a.scope=?', 'c.is_demo=?'];
  const params: SqlValue[] = [String(user.id), String(user.scope), Number(user.is_demo)];
  const add = (clause: string, value: SqlValue) => { clauses.push(clause); params.push(value); };
  if (filters.from) add('a.created_at>=?', filters.from + 'T00:00:00.000Z');
  if (filters.to) add('a.created_at<=?', filters.to + 'T23:59:59.999Z');
  if (filters.level !== undefined) add('a.level=?', filters.level);
  if (filters.purchase) add(expression.purchase + '=?', filters.purchase);
  if (filters.status) add(expression.status + '=?', filters.status);
  if (filters.eligibility) add(expression.eligibility + '=?', filters.eligibility);
  return { clause: clauses.join(' AND '), params };
}
async function eligibleUser(tx: Executor, requested: Row) {
  const user = await tx.get('SELECT id,scope,is_demo,blocked FROM users WHERE id=? AND scope=? AND is_demo=?', [String(requested.id), String(requested.scope), Number(requested.is_demo)]);
  if (!user || Number(user.blocked) === 1) reject(401, 'AUTH_REQUIRED', 'Entre em uma conta elegível para consultar as comissões.');
  return user;
}
function eventDTO(row: Row): CommissionEvent {
  const snapshot = object(row.snapshot), contract = object(row.contract_snapshot);
  const plan = contract.plan && typeof contract.plan === 'object' && !Array.isArray(contract.plan) ? contract.plan as Record<string, unknown> : {};
  const rateBps = row.rate_bps === null ? null : integer(row.rate_bps);
  const amountCents = row.amount_cents === null ? null : integer(row.amount_cents);
  const creditedCents = integer(row.credited), debitedCents = integer(row.debited);
  if (creditedCents < 0 || debitedCents > 0) throw new Error('Invalid commission statement ledger direction');
  const status = String(row.effective_status) as CommissionStatus;
  const eligibility = String(row.eligibility) as CommissionEvent['eligibility'];
  let explanation = String(row.status) === 'PENDING_RATE' ? 'A taxa não estava definida no evento. Não há valor de comissão liberado por este registro.'
    : String(row.status) === 'INELIGIBLE' ? 'O participante destinatário não atendia à condição registrada de contrato ativo e conta elegível no momento da origem.'
      : String(row.status) === 'CONFIRMED' ? 'O evento registrou elegibilidade na origem. O crédito encontrado no extrato aparece separadamente.'
        : 'Este evento antigo não informa uma condição de elegibilidade reconhecida.';
  if (status === 'REVERSED') explanation += ' Um estorno posterior está vinculado ao evento; o registro original permanece preservado.';
  const warnings: string[] = [];
  if (String(row.status) === 'CONFIRMED' && amountCents !== null && creditedCents !== amountCents) warnings.push('O valor apurado difere do crédito encontrado no extrato.');
  if (row.reversal_id && amountCents !== null && -debitedCents !== amountCents) warnings.push('O estorno registrado difere do débito encontrado no extrato.');
  if (row.debit_id && !row.reversal_id) warnings.push('Há débito vinculado sem registro de justificativa de estorno.');
  const ledger: CommissionEvent['ledger'] = [];
  if (row.credit_id) ledger.push({ id: String(row.credit_id), kind: 'AFFILIATE_COMMISSION', amountCents: creditedCents, createdAt: String(row.credit_at) });
  if (row.debit_id) ledger.push({ id: String(row.debit_id), kind: 'AFFILIATE_REVERSAL', amountCents: debitedCents, createdAt: String(row.debit_at) });
  return {
    id: String(row.id), reference: reference(String(row.id)), createdAt: String(row.created_at), isDemo: Number(row.is_demo) === 1,
    level: integer(row.level), purchase: String(row.purchase) as CommissionEvent['purchase'], status, storedStatus: String(row.status), eligibility,
    baseCents: integer(row.base_cents), rateBps, amountCents, creditedCents, reversedCents: integer(-debitedCents), netCents: integer(creditedCents + debitedCents), condition: explanation,
    evidenceWarning: warnings.length ? warnings.join(' ') + ' Solicite a revisão deste evento.' : null,
    snapshot: { version: typeof snapshot.version === 'string' ? snapshot.version : null, base: snapshot.base === 'NET_CONTRACT_PRICE' ? 'NET_CONTRACT_PRICE' : null, eligibility: snapshot.eligibility === 'ACTIVE_CONTRACT' ? 'ACTIVE_CONTRACT' : null, compression: typeof snapshot.compression === 'boolean' ? snapshot.compression : null },
    origin: { contractReference: reference(String(row.contract_id)), planId: String(row.plan_id), planName: typeof plan.name === 'string' ? plan.name : String(row.plan_id), machine: typeof plan.machine === 'string' ? plan.machine : 'Equipamento não registrado', coin: typeof plan.coin === 'string' ? plan.coin : '', planVersion: typeof contract.version === 'number' ? integer(contract.version) : null },
    ledger,
    reversal: row.reversal_id || row.debit_id ? { reference: row.reversal_id ? reference(String(row.reversal_id)) : null, recordedAt: String(row.reversal_at ?? row.debit_at), recorded: !!row.reversal_id } : null,
  };
}

/** Own recorded events only. No distribution, settlement, mutation or synthetic N7 row. */
export async function commissionStatement(db: Database, requested: Row, input: CommissionStatementRequest, now = Date.now()): Promise<CommissionStatementData> {
  return db.transaction(async tx => {
    const user = await eligibleUser(tx, requested), { page, pageSize, ...filters } = input;
    const where = condition(db, user, filters), expression = expressions(db);
    const summary = await tx.get(`SELECT COUNT(*) AS count,
      COALESCE(SUM(COALESCE(credit.amount_cents,0)),0) AS credits,COALESCE(SUM(-COALESCE(debit.amount_cents,0)),0) AS reversals,
      COALESCE(SUM(COALESCE(credit.amount_cents,0)+COALESCE(debit.amount_cents,0)),0) AS net,
      COALESCE(SUM(CASE WHEN a.status='INELIGIBLE' THEN 1 ELSE 0 END),0) AS ineligible,
      COALESCE(SUM(CASE WHEN a.status='PENDING_RATE' THEN 1 ELSE 0 END),0) AS pending,
      COALESCE(SUM(CASE WHEN x.id IS NOT NULL OR debit.id IS NOT NULL THEN 1 ELSE 0 END),0) AS reversed,
      COALESCE(SUM(CASE WHEN a.level=7 AND ${expression.purchase}='first' THEN 1 ELSE 0 END),0) AS first_n7,
      COALESCE(SUM(CASE WHEN a.level=7 AND ${expression.purchase}='first' AND a.status='PENDING_RATE' THEN 1 ELSE 0 END),0) AS pending_n7
      ${relations} WHERE ${where.clause}`, where.params);
    const totalEvents = integer(summary?.count), totalPages = Math.max(1, Math.ceil(totalEvents / pageSize)), currentPage = Math.min(page, totalPages);
    const rows = await tx.all(`${selection(db)} WHERE ${where.clause} ORDER BY a.created_at DESC,a.id DESC LIMIT ? OFFSET ?`, [...where.params, pageSize, (currentPage - 1) * pageSize]);
    return {
      generatedAt: iso(now), isDemo: Number(user.is_demo) === 1, currency: 'USD', timezone: 'UTC', periodBasis: 'EVENT_ORIGIN', filters, events: rows.map(eventDTO),
      pagination: { page: currentPage, pageSize, totalPages, totalEvents },
      totals: { creditedCents: integer(summary?.credits), reversedCents: integer(summary?.reversals), netCents: integer(summary?.net), ineligibleEvents: integer(summary?.ineligible), pendingRateEvents: integer(summary?.pending), reversedEvents: integer(summary?.reversed) },
      firstN7: { rateDefinedInCurrentTable: COMMISSIONS[6].firstBps !== null, recordedEvents: integer(summary?.first_n7), pendingRateEvents: integer(summary?.pending_n7) },
      exportMaxRows: COMMISSION_EXPORT_MAX_ROWS,
    };
  });
}
function csvLine(event: CommissionEvent) {
  const text = [event.id, event.createdAt, event.isDemo ? 'Demonstração' : 'Conta real', String(event.level), event.purchase,
    event.status, event.storedStatus, event.eligibility, String(event.baseCents), event.rateBps === null ? '' : String(event.rateBps),
    event.amountCents === null ? '' : String(event.amountCents), String(event.creditedCents), String(event.reversedCents), String(event.netCents),
    event.origin.contractReference, event.origin.planName, event.origin.machine, event.origin.coin, event.origin.planVersion === null ? '' : String(event.origin.planVersion),
    event.snapshot.version ?? '', event.snapshot.base ?? '', event.snapshot.eligibility ?? '', event.snapshot.compression === null ? '' : event.snapshot.compression ? 'Sim' : 'Não',
    event.condition, event.evidenceWarning ?? '', event.ledger.map(entry => entry.id + ' | ' + entry.createdAt + ' | ' + entry.amountCents).join(' / '),
    event.reversal?.reference ?? '', event.reversal?.recordedAt ?? ''];
  const numeric = new Set([3, 8, 9, 10, 11, 12, 13, 18]);
  return text.map((value, index) => numeric.has(index) && /^-?\d+$/.test(value) ? value : safeCsvText(value)).join(';');
}
const csvHeader = ['Evento próprio', 'Origem UTC', 'Ambiente', 'Nível', 'Compra', 'Estado atual', 'Estado na origem', 'Elegibilidade na origem', 'Base centavos USD', 'Taxa bps', 'Valor apurado centavos USD', 'Crédito vinculado centavos USD', 'Estorno vinculado centavos USD', 'Resultado vinculado centavos USD', 'Contrato origem referência', 'Plano capturado', 'Máquina capturada', 'Moeda minerada', 'Versão plano', 'Versão comissão', 'Base registrada', 'Condição registrada', 'Compressão registrada', 'Explicação', 'Evidência para revisão', 'Vínculos próprios ao extrato', 'Estorno referência', 'Estorno UTC'];

/** Prepare a bounded complete file in memory; database is released before HTTP delivery. */
export async function commissionCsv(db: Database, requested: Row, filters: CommissionFilters, signal: AbortSignal) {
  const aborted = () => { if (signal.aborted) throw new DomainError(499, 'EXPORT_CANCELLED', 'Exportação cancelada.'); };
  const prepared = await db.transaction(async tx => {
    aborted();
    const user = await eligibleUser(tx, requested), where = condition(db, user, filters);
    const total = integer((await tx.get(`SELECT COUNT(*) AS count ${relations} WHERE ${where.clause}`, where.params))?.count);
    if (total > COMMISSION_EXPORT_MAX_ROWS) reject(422, 'COMMISSION_EXPORT_LIMIT', 'Este filtro ultrapassa 10.000 eventos. Selecione um período menor para exportar o arquivo completo.');
    const lines = ['\uFEFF' + csvHeader.map(safeCsvText).join(';')];
    let cursor: { at: string; id: string } | null = null, written = 0;
    while (written < total) {
      aborted();
      const seek = cursor ? ' AND (a.created_at<? OR (a.created_at=? AND a.id<?))' : '';
      const cursorValues = cursor ? [cursor.at, cursor.at, cursor.id] : [];
      const batch: Row[] = await tx.all(`${selection(db)} WHERE ${where.clause}${seek} ORDER BY a.created_at DESC,a.id DESC LIMIT ?`, [...where.params, ...cursorValues, EXPORT_BATCH_SIZE]);
      if (!batch.length) throw new Error('Incomplete commission export snapshot');
      lines.push(...batch.map(row => csvLine(eventDTO(row))));
      written += batch.length;
      const last = batch[batch.length - 1]; cursor = { at: String(last.created_at), id: String(last.id) };
    }
    if (written !== total) throw new Error('Commission export row count mismatch');
    aborted();
    return { csv: lines.join('\r\n') + '\r\n', rows: written, isDemo: Number(user.is_demo) === 1 };
  });
  aborted();
  return { ...prepared, filename: 'AMNG-comissoes' + (prepared.isDemo ? '-demonstracao' : '') + '-' + iso().slice(0, 10) + '.csv' };
}
