import { randomUUID } from 'node:crypto';
import type { CareerComponent, WalletId } from '../shared/types.ts';
import type { Executor, Row } from './database.ts';
import { sha256 } from './security.ts';

export const DAY = 86_400_000;
export const uid = (prefix: string) => `${prefix}_${randomUUID()}`;
export const iso = (milliseconds = Date.now()) => new Date(milliseconds).toISOString();
export class DomainError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function reject(status: number, code: string, message: string): never { throw new DomainError(status, code, message); }
export function cents(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 100_000_000) reject(422,'INVALID_AMOUNT','Informe um valor válido em centavos inteiros.');
  return value;
}
/** Exact integer arithmetic. This policy is only used in the explicitly simulated environment. */
export function applyBps(principal: number, bps: number) {
  cents(principal);
  if (!Number.isInteger(bps) || bps < 0 || bps > 10000) reject(422,'INVALID_RATE','Taxa inválida.');
  return Number(BigInt(principal) * BigInt(bps) / 10000n);
}
export function canonicalPayload(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalPayload).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([key,item]) => `${JSON.stringify(key)}:${canonicalPayload(item)}`).join(',')}}`;
  return JSON.stringify(value);
}
export async function audit(tx: Executor, user: Row | null, action: string, target: string, details: unknown, scope = String(user?.scope ?? 'real')) {
  await tx.run('INSERT INTO audit_events(id,scope,actor_id,action,target,details,created_at) VALUES(?,?,?,?,?,?,?)',
    [uid('audit'),scope,user ? String(user.id) : null,action,target,JSON.stringify(details),iso()]);
}
export async function balance(tx: Executor, userId: string, wallet: WalletId) {
  const result = await tx.get('SELECT COALESCE(SUM(amount_cents),0) AS balance FROM ledger_entries WHERE user_id = ? AND wallet = ?', [userId,wallet]);
  const number = Number(result?.balance ?? 0);
  if (!Number.isSafeInteger(number)) throw new Error('Unsafe ledger balance');
  return number;
}
export async function postLedger(tx: Executor, params: { user: Row; wallet: WalletId; amount: number; key: string; kind: string; description: string; reference: string; status?: string; createdAt?: string; contra?: string }) {
  if (!Number.isSafeInteger(params.amount) || params.amount === 0 || Math.abs(params.amount) > 100_000_000_0000) reject(422,'INVALID_AMOUNT','Lançamento inválido.');
  const existing = await tx.get('SELECT id,user_id,wallet,amount_cents FROM ledger_entries WHERE business_key = ?', [params.key]);
  if (existing) {
    if (existing.user_id !== params.user.id || existing.wallet !== params.wallet || Number(existing.amount_cents) !== params.amount) reject(409,'IDEMPOTENCY_CONFLICT','Chave já utilizada para outro lançamento.');
    return String(existing.id);
  }
  if (params.amount < 0 && await balance(tx,String(params.user.id),params.wallet) + params.amount < 0) reject(409,'INSUFFICIENT_BALANCE','Saldo disponível insuficiente.');
  const id = uid('entry'), journal = uid('journal'), at = params.createdAt ?? iso();
  await tx.run('INSERT INTO accounting_journals(id,scope,business_key,created_at,description,is_demo) VALUES(?,?,?,?,?,?)',
    [journal,String(params.user.scope),params.key,at,params.description,Number(params.user.is_demo)]);
  const lines = [
    { account: `user:${params.user.id}:${params.wallet}`, amount: params.amount },
    { account: params.contra ?? (params.user.is_demo ? 'demo:simulation-clearing' : 'operation:clearing'), amount: -params.amount },
  ];
  if (lines.reduce((sum,line) => sum + line.amount,0) !== 0) throw new Error('Unbalanced journal');
  for (const line of lines) await tx.run('INSERT INTO accounting_lines(id,journal_id,account,amount_cents) VALUES(?,?,?,?)', [uid('line'),journal,line.account,line.amount]);
  await tx.run(`INSERT INTO ledger_entries(id,scope,user_id,journal_id,business_key,wallet,amount_cents,kind,description,status,created_at,reference,is_demo)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, [id,String(params.user.scope),String(params.user.id),journal,params.key,params.wallet,params.amount,params.kind,params.description,params.status ?? 'CONFIRMED',at,params.reference,Number(params.user.is_demo)]);
  return id;
}
export async function idempotent(tx: Executor, user: Row, command: string, key: string, payload: unknown, work: () => Promise<string>) {
  await tx.lockUser(String(user.id));
  const payloadHash = sha256(canonicalPayload(payload));
  const previous = await tx.get('SELECT payload_hash,result_id FROM idempotency_commands WHERE user_id = ? AND command = ? AND command_key = ?', [String(user.id),command,key]);
  if (previous) {
    if (previous.payload_hash !== payloadHash) reject(409,'IDEMPOTENCY_CONFLICT','Esta chave já foi utilizada com parâmetros diferentes.');
    return String(previous.result_id);
  }
  const result = await work();
  await tx.run('INSERT INTO idempotency_commands(scope,user_id,command,command_key,payload_hash,result_id,created_at) VALUES(?,?,?,?,?,?,?)',
    [String(user.scope),String(user.id),command,key,payloadHash,result,iso()]);
  return result;
}
export async function requireFinancialRule(tx: Executor, user: Row, rule: string) {
  const config = await tx.get('SELECT enabled,status FROM product_rules WHERE scope = ? AND id = ?', [String(user.scope),rule]);
  if (Number(user.is_demo) === 1 && rule !== 'cycles' && (!config || config.status !== 'NOT_APPLICABLE')) return;
  if (!config || config.status !== 'CONFIRMED' || Number(config.enabled) !== 1) reject(409,'RULE_PENDING','Esta operação aguarda aprovação de regras e homologação operacional.');
  // No real provider/policy has been supplied. Editing a flag cannot manufacture that approval.
  reject(409,'INTEGRATION_REQUIRED','Esta operação requer uma política financeira completa e uma integração homologada.');
}
const clamp = (value: number, max: number) => Math.min(max,Math.max(0,value));
export function calculatePulse(input: { power: number; previousPower: number; retainedPower: number; completedWeighted: number; eligibleWeighted: number; lines: number[] }): CareerComponent[] {
  const zero = input.power === 0;
  const networkPower = input.lines.reduce((sum,line) => sum + line,0);
  return [
    { id:'continuity',name:'Continuidade',max:35,score:zero ? 0 : clamp(input.eligibleWeighted ? 35 * input.completedWeighted / input.eligibleWeighted : 0,35),description:'Ciclos concluídos ponderados ÷ ciclos elegíveis ponderados.' },
    { id:'retention',name:'Permanência',max:25,score:zero ? 0 : input.previousPower ? clamp(25 * input.retainedPower / input.previousPower,25) : 12.5,description:'Potência anterior ainda vigente ÷ potência anterior.' },
    { id:'distribution',name:'Distribuição',max:20,score:zero ? 0 : networkPower ? clamp(20 * (1 - Math.max(...input.lines,0) / networkPower) / 0.75,20) : 0,description:'Distribuição da potência entre linhas diretas, com teto de 20.' },
    { id:'evolution',name:'Evolução',max:20,score:zero ? 0 : input.previousPower ? clamp(10 + 50 * (input.power / input.previousPower - 1),20) : 10,description:'Evolução da potência atual em relação ao fechamento anterior.' },
  ];
}
