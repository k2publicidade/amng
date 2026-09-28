import { chmod, mkdtemp, open, rmdir, unlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as pause } from 'node:timers/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Database, Executor, Row, SqlValue } from './database.ts';
import { DomainError, reject } from './domain.ts';
import type { LedgerEntry, WalletId } from '../shared/types.ts';
import type { LedgerFilters, LedgerProduct, LedgerStatementRequest, WalletStatementData, WalletStatementEntry } from '../shared/ledger-types.ts';

export const LEDGER_EXPORT_MAX_ROWS = 100_000;
const EXPORT_BATCH_SIZE = 1_000;
const executeFile = promisify(execFile);
const wallets: WalletId[] = ['deposit', 'earnings', 'affiliate'];
const productSql = `CASE
  WHEN l.kind IN ('CLOUD_PURCHASE','PURCHASE','MINING_INCOME','MINING','PROFIT_SHARING') THEN 'cloud'
  WHEN l.kind IN ('MARKET_ENTRY','MARKET_WITHDRAWAL','MARKET_EARNINGS','MARKET_PRINCIPAL_RETURN') THEN 'market'
  WHEN l.kind IN ('CAREER_SALARY','CAREER_BONUS','SALARY','BONUS') THEN 'career'
  WHEN l.kind IN ('AFFILIATE_COMMISSION','AFFILIATE_REVERSAL','AFFILIATE','COMMISSION','DEMO_AFFILIATE_FIXTURE') THEN 'affiliate'
  ELSE 'wallet' END`;
const statusSql = `CASE WHEN l.kind='WITHDRAWAL_RESERVED' AND p.status='PAID' THEN 'CONFIRMED'
  WHEN l.kind='WITHDRAWAL_RESERVED' AND p.status='REJECTED' THEN 'REVERSED' ELSE l.status END`;
const relations = `FROM ledger_entries l
  LEFT JOIN payments p ON p.id=l.reference AND p.user_id=l.user_id AND p.scope=l.scope AND p.is_demo=l.is_demo
  LEFT JOIN contracts c ON c.id=l.reference AND c.user_id=l.user_id AND c.scope=l.scope AND c.is_demo=l.is_demo`;
const selection = `SELECT l.*,${statusSql} AS effective_status,${productSql} AS product,
  c.id AS contract_id,c.plan_id AS contract_plan_id,c.principal_cents AS contract_principal,c.snapshot AS contract_snapshot,
  p.id AS payment_id,p.status AS payment_status,p.amount_cents AS payment_gross,p.fee_cents AS payment_fee,p.net_cents AS payment_net ${relations}`;

const integer = (value: unknown) => {
  const result = Number(value ?? 0);
  if (!Number.isSafeInteger(result)) throw new Error('Unsafe ledger report aggregate');
  return result;
};
function ledgerStatus(value: unknown): LedgerEntry['status'] {
  if (!['CONFIRMED', 'PENDING', 'RESERVED', 'REVERSED'].includes(String(value))) throw new Error('Unknown ledger report status');
  return value as LedgerEntry['status'];
}
function ownedSnapshot(row: Row) {
  const snapshot = JSON.parse(String(row.snapshot ?? row.contract_snapshot)) as {
    plan: { id: string; name: string; coin: string; machine: string; rateBps: number };
    version?: number; termsVersion?: string; calculation?: string;
  };
  if (!snapshot.plan || typeof snapshot.plan.name !== 'string' || typeof snapshot.plan.coin !== 'string') throw new Error('Invalid contract report snapshot');
  return snapshot;
}
function entryDTO(row: Row): WalletStatementEntry {
  const snapshot = row.contract_id ? ownedSnapshot(row) : null;
  return {
    id: String(row.id), wallet: row.wallet as WalletId, amountCents: integer(row.amount_cents),
    kind: String(row.kind), description: String(row.description), status: ledgerStatus(row.effective_status),
    storedStatus: ledgerStatus(row.status), createdAt: String(row.created_at), reference: String(row.reference),
    isDemo: Number(row.is_demo) === 1, journalId: String(row.journal_id), businessKey: String(row.business_key),
    currency: 'USD', product: row.product as LedgerProduct,
    contract: snapshot ? {
      id: String(row.contract_id), planId: String(row.contract_plan_id), name: snapshot.plan.name,
      coin: snapshot.plan.coin, machine: snapshot.plan.machine, principalCents: integer(row.contract_principal),
      rateBps: integer(snapshot.plan.rateBps), termsVersion: snapshot.termsVersion ?? null,
      calculation: snapshot.calculation ?? null, planVersion: snapshot.version === undefined ? null : integer(snapshot.version),
    } : null,
    payment: row.payment_id ? {
      id: String(row.payment_id), status: String(row.payment_status), grossCents: integer(row.payment_gross),
      feeCents: integer(row.payment_fee), netCents: integer(row.payment_net),
    } : null,
  };
}
function where(db: Database, user: Row, filters: LedgerFilters) {
  const conditions = ['l.user_id=?', 'l.scope=?', 'l.is_demo=?'];
  const params: SqlValue[] = [String(user.id), String(user.scope), Number(user.is_demo)];
  const add = (condition: string, value: SqlValue) => { conditions.push(condition); params.push(value); };
  if (filters.wallet) add('l.wallet=?', filters.wallet);
  if (filters.kind) add('l.kind=?', filters.kind);
  if (filters.status) add(`${statusSql}=?`, filters.status);
  if (filters.product) add(`${productSql}=?`, filters.product);
  if (filters.contractId) add('c.id=?', filters.contractId);
  if (filters.coin) add(db.dialect === 'postgres' ? "c.snapshot::jsonb #>> '{plan,coin}' = ?" : "json_extract(c.snapshot,'$.plan.coin') = ?", filters.coin);
  if (filters.from) add('l.created_at>=?', `${filters.from}T00:00:00.000Z`);
  if (filters.to) add('l.created_at<=?', `${filters.to}T23:59:59.999Z`);
  if (filters.search) {
    const escaped = `%${filters.search.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
    conditions.push("(LOWER(l.description) LIKE ? ESCAPE '\\' OR LOWER(l.reference) LIKE ? ESCAPE '\\' OR LOWER(l.business_key) LIKE ? ESCAPE '\\')");
    params.push(escaped, escaped, escaped);
  }
  return { clause: conditions.join(' AND '), params };
}
async function countRows(tx: Executor, condition: ReturnType<typeof where>) {
  return integer((await tx.get(`SELECT COUNT(*) AS count ${relations} WHERE ${condition.clause}`, condition.params))?.count);
}

/** Reports read every matching ledger row; they never settle a cycle or change a balance. */
export async function walletStatement(db: Database, user: Row, input: LedgerStatementRequest): Promise<WalletStatementData> {
  const { page, pageSize, ...filters } = input;
  return db.transaction(async tx => {
    const condition = where(db, user, filters);
    const summary = await tx.get(`SELECT COUNT(*) AS count,
      COALESCE(SUM(CASE WHEN l.amount_cents>0 THEN l.amount_cents ELSE 0 END),0) AS credits,
      COALESCE(SUM(CASE WHEN l.amount_cents<0 THEN -l.amount_cents ELSE 0 END),0) AS debits,
      COALESCE(SUM(l.amount_cents),0) AS net ${relations} WHERE ${condition.clause}`, condition.params);
    const totalEntries = integer(summary?.count), totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
    const currentPage = Math.min(page, totalPages);
    const rows = await tx.all(`${selection} WHERE ${condition.clause} ORDER BY l.created_at DESC,l.id DESC LIMIT ? OFFSET ?`, [...condition.params, pageSize, (currentPage - 1) * pageSize]);
    const scopeParams = [String(user.id), String(user.scope), Number(user.is_demo)];
    const balances = await tx.all('SELECT wallet,COALESCE(SUM(amount_cents),0) AS available FROM ledger_entries WHERE user_id=? AND scope=? AND is_demo=? GROUP BY wallet', scopeParams);
    const reservations = await tx.all("SELECT wallet,COALESCE(SUM(amount_cents),0) AS reserved FROM payments WHERE user_id=? AND scope=? AND is_demo=? AND type='WITHDRAWAL' AND status IN ('PENDING','PROCESSING','REVIEW_REQUIRED') GROUP BY wallet", scopeParams);
    const kinds = await tx.all('SELECT DISTINCT kind FROM ledger_entries WHERE user_id=? AND scope=? AND is_demo=? ORDER BY kind', scopeParams);
    const contracts = (await tx.all('SELECT id,plan_id,snapshot FROM contracts WHERE user_id=? AND scope=? AND is_demo=? ORDER BY started_at DESC,id DESC', scopeParams)).map(row => {
      const snapshot = ownedSnapshot(row);
      return { id: String(row.id), planId: String(row.plan_id), label: snapshot.plan.name, coin: snapshot.plan.coin };
    });
    return {
      generatedAt: new Date().toISOString(), timezone: 'UTC', currency: 'USD', isDemo: Number(user.is_demo) === 1,
      filters, entries: rows.map(entryDTO), pagination: { page: currentPage, pageSize, totalPages, totalEntries },
      totals: { creditsCents: integer(summary?.credits), debitsCents: integer(summary?.debits), netCents: integer(summary?.net) },
      balances: wallets.map(wallet => {
        const availableCents = integer(balances.find(row => row.wallet === wallet)?.available);
        const reservedCents = integer(reservations.find(row => row.wallet === wallet)?.reserved);
        return { wallet, availableCents, reservedCents, balanceCents: integer(availableCents + reservedCents) };
      }),
      options: { kinds: kinds.map(row => String(row.kind)), contracts, coins: [...new Set(contracts.map(contract => contract.coin))].sort() },
      exportMaxRows: LEDGER_EXPORT_MAX_ROWS,
    };
  });
}

/** Quoting alone does not stop spreadsheet formula execution. Sanitize text before quoting. */
export function safeCsvText(value: string) {
  const clean = value.replaceAll('\0', '').replace(/[\t\r\n]/g, ' ');
  const protectedText = /^[\s\u0000-\u001f]*[=+\-@]/u.test(clean) ? `'${clean}` : clean;
  return `"${protectedText.replaceAll('"', '""')}"`;
}
function decimalCents(value: number) {
  const amount = BigInt(integer(value));
  const absolute = amount < 0n ? -amount : amount;
  return `${amount < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}
const walletLabels = { deposit: 'Depósitos', earnings: 'Rendimentos', affiliate: 'Afiliados' };
const csvHeader = ['ID lançamento', 'Data UTC', 'Carteira', 'Tipo', 'Descrição', 'Valor USD', 'Valor centavos', 'Moeda saldo', 'Estado atual', 'Estado original', 'Produto', 'Referência', 'Diário', 'Chave de negócio', 'Demonstração', 'Contrato próprio', 'Plano', 'Moeda minerada', 'Base contratada centavos', 'Taxa contratada bps', 'Versão plano', 'Versão termos', 'Cálculo contratado', 'Pagamento', 'Estado pagamento', 'Bruto pagamento centavos', 'Taxa pagamento centavos', 'Líquido pagamento centavos', 'Equipamento contratado'];
function csvEntry(entry: WalletStatementEntry) {
  const values = [entry.id, entry.createdAt, walletLabels[entry.wallet], entry.kind, entry.description,
    decimalCents(entry.amountCents), String(entry.amountCents), entry.currency, entry.status, entry.storedStatus,
    entry.product, entry.reference, entry.journalId, entry.businessKey, entry.isDemo ? 'Sim' : 'Não',
    entry.contract?.id ?? '', entry.contract?.name ?? '', entry.contract?.coin ?? '',
    entry.contract ? String(entry.contract.principalCents) : '', entry.contract ? String(entry.contract.rateBps) : '',
    entry.contract?.planVersion === null || !entry.contract ? '' : String(entry.contract.planVersion),
    entry.contract?.termsVersion ?? '', entry.contract?.calculation ?? '', entry.payment?.id ?? '',
    entry.payment?.status ?? '', entry.payment ? String(entry.payment.grossCents) : '',
    entry.payment ? String(entry.payment.feeCents) : '', entry.payment ? String(entry.payment.netCents) : '', entry.contract?.machine ?? ''];
  // Amount columns contain validated numbers only; text cells are always protected.
  const numericColumns = new Set([5, 6, 18, 19, 20, 25, 26, 27]);
  return values.map((value, index) => numericColumns.has(index) && /^-?\d+(\.\d{2})?$/.test(value) ? value : safeCsvText(value)).join(';') + '\r\n';
}
export interface LedgerExportSpool { path: string; rows: number; filename: string; cleanup: () => Promise<void>; }

/** Windows ignores POSIX read bits. Protect the empty directory before any report is written. */
async function privateSpoolDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'amng-ledger-'));
  try {
    if (process.platform === 'win32') {
      const program = `$ErrorActionPreference = 'Stop'
$taskSpoolTarget = $env:AMNG_LEDGER_SPOOL_TARGET
$taskSpoolIdentity = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$taskSpoolAcl = [System.Security.AccessControl.DirectorySecurity]::new()
$taskSpoolAcl.SetOwner($taskSpoolIdentity)
$taskSpoolAcl.SetAccessRuleProtection($true, $false)
$taskSpoolRule = [System.Security.AccessControl.FileSystemAccessRule]::new($taskSpoolIdentity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
$taskSpoolAcl.AddAccessRule($taskSpoolRule)
Set-Acl -LiteralPath $taskSpoolTarget -AclObject $taskSpoolAcl`;
      // Static encoded program plus an environment value: no interpolated shell path or user input.
      await executeFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(program, 'utf16le').toString('base64')], {
        env: { ...process.env, AMNG_LEDGER_SPOOL_TARGET: directory }, timeout: 10_000, windowsHide: true,
      });
    } else await chmod(directory, 0o700);
    return directory;
  } catch (error) {
    await rmdir(directory).catch(() => {});
    throw new Error('Não foi possível preparar uma pasta privada para a exportação.', { cause: error });
  }
}

async function removeSpoolPath(path: string, directory: boolean) {
  for (let attempt = 0; ; attempt++) {
    try { if (directory) await rmdir(path); else await unlink(path); return; }
    catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') return;
      if (attempt < 3 && (code === 'EBUSY' || code === 'EPERM' || code === 'ENOTEMPTY')) { await pause(50 * (attempt + 1)); continue; }
      throw new Error('Não foi possível remover o arquivo temporário privado da exportação.', { cause: error });
    }
  }
}

/** Spool a consistent bounded report before sending any bytes to a slow client. */
export async function spoolLedgerCsv(db: Database, user: Row, filters: LedgerFilters, signal: AbortSignal): Promise<LedgerExportSpool> {
  const directory = await privateSpoolDirectory();
  const path = join(directory, 'statement.csv');
  const cleanup = async () => { await removeSpoolPath(path, false); await removeSpoolPath(directory, true); };
  const aborted = () => { if (signal.aborted) throw new DomainError(499, 'EXPORT_CANCELLED', 'Exportação cancelada.'); };
  let file: Awaited<ReturnType<typeof open>> | undefined;
  try {
    file = await open(path, 'wx', 0o600);
    const write = async (value: string) => {
      const buffer = Buffer.from(value, 'utf8');
      for (let offset = 0; offset < buffer.length;) {
        aborted();
        const result = await file!.write(buffer, offset, buffer.length - offset, null);
        if (result.bytesWritten === 0) throw new Error('Incomplete ledger export write');
        offset += result.bytesWritten;
      }
    };
    const rows = await db.transaction(async tx => {
      aborted();
      const condition = where(db, user, filters);
      const total = await countRows(tx, condition);
      if (total > LEDGER_EXPORT_MAX_ROWS) reject(422, 'EXPORT_LIMIT', 'Este filtro ultrapassa 100.000 registros. Selecione um período menor para exportar o arquivo completo.');
      await write('\uFEFF' + csvHeader.map(safeCsvText).join(';') + '\r\n');
      let cursor: { at: string; id: string } | null = null;
      let written = 0;
      while (written < total) {
        aborted();
        const seek = cursor ? ' AND (l.created_at<? OR (l.created_at=? AND l.id<?))' : '';
        const cursorParams = cursor ? [cursor.at, cursor.at, cursor.id] : [];
        const batch: Row[] = await tx.all(`${selection} WHERE ${condition.clause}${seek} ORDER BY l.created_at DESC,l.id DESC LIMIT ?`, [...condition.params, ...cursorParams, EXPORT_BATCH_SIZE]);
        if (!batch.length) throw new Error('Incomplete ledger export snapshot');
        await write(batch.map(row => csvEntry(entryDTO(row))).join(''));
        written += batch.length;
        const last = batch[batch.length - 1];
        cursor = { at: String(last.created_at), id: String(last.id) };
      }
      if (written !== total) throw new Error('Ledger export row count mismatch');
      return written;
    });
    await file.close(); file = undefined;
    aborted();
    return { path, rows, filename: `AMNG-extrato${Number(user.is_demo) === 1 ? '-demonstracao' : ''}-${new Date().toISOString().slice(0, 10)}.csv`, cleanup };
  } catch (error) {
    await file?.close().catch(() => {});
    await cleanup();
    throw error;
  }
}
