import type { CareerAwardEvidence, CareerAwardEvidenceStatus, CareerContractEvidence, CareerEvidenceData, CareerEvidenceEligibility, CareerEvidenceSource } from '../shared/career-evidence-types.ts';
import type { CareerComponent } from '../shared/types.ts';
import type { Database, Executor, Row, SqlValue } from './database.ts';
import { addMonths, CAREER_VERSION, careerBudget, careerSalaryProposal, measureCareer, monthBounds, type CareerPeriod } from './career.ts';
import { STAGES } from './catalog.ts';
import { iso, reject } from './domain.ts';

export interface CareerEvidenceInput {
  month: string;
  page: number;
  pageSize: number;
  source: CareerEvidenceSource;
  eligibility: CareerEvidenceEligibility;
}

const nullableNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;
function safeInteger(value: unknown): number {
  const number = Number(value ?? 0);
  if (!Number.isSafeInteger(number)) throw new Error('Unsafe career evidence integer');
  return number;
}
function snapshotObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string') return {};
  const parsed: unknown = JSON.parse(value);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
}
function capturedPower(value: unknown): CareerPeriod['powerContracts'] | null {
  if (!Array.isArray(value)) return null;
  return value.map(item => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !Number.isSafeInteger(item.weight) || item.weight < 0 || !(item.line === null || typeof item.line === 'string')) throw new Error('Invalid captured career power');
    return { id: item.id, weight: item.weight, line: item.line };
  });
}
function recordedComponents(value: unknown): CareerComponent[] {
  if (!Array.isArray(value)) return [];
  return value.filter(item => item && typeof item === 'object' && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.description === 'string' && Number.isFinite(item.score) && Number.isFinite(item.max)).map(item => ({ id: item.id, name: item.name, description: item.description, score: item.score, max: item.max }));
}
const stageName = (index: unknown) => typeof index === 'number' && Number.isInteger(index) && STAGES[index] ? STAGES[index].name : null;
const memberName = (name: string, own: boolean, demo: boolean) => {
  if (own || demo) return name;
  const parts = name.trim().split(/\s+/);
  return `${parts[0] || 'Participante'}${parts[1] ? ` ${parts[1][0]}.` : ''}`;
};
const reference = (id: string) => `#${id.slice(-8).toUpperCase()}`;

function treeQuery(user: Row) {
  return {
    sql: `WITH RECURSIVE career_tree(id,name,level,line_id) AS (
      SELECT id,name,0,CAST(NULL AS TEXT) FROM users WHERE id=? AND scope=? AND is_demo=?
      UNION ALL
      SELECT u.id,u.name,t.level+1,CASE WHEN t.level=0 THEN u.id ELSE t.line_id END
      FROM users u JOIN career_tree t ON u.sponsor_id=t.id
      WHERE u.scope=? AND u.is_demo=? AND t.level<7
    )`,
    params: [String(user.id), String(user.scope), Number(user.is_demo), String(user.scope), Number(user.is_demo)] as SqlValue[],
  };
}

async function contractPage(tx: Executor, dialect: Database['dialect'], user: Row, input: CareerEvidenceInput, power: CareerPeriod['powerContracts'], from: string, cutoff: string) {
  const tree = treeQuery(user);
  if (await tx.get(`${tree.sql} SELECT id FROM career_tree GROUP BY id HAVING COUNT(*)>1 LIMIT 1`, tree.params)) reject(409, 'SPONSOR_CYCLE', 'Os vínculos da rede precisam de revisão antes de apresentar a composição.');
  const captured = dialect === 'sqlite'
    ? `SELECT json_extract(value,'$.id') AS id,json_extract(value,'$.weight') AS weight FROM json_each(?)`
    : `SELECT item->>'id' AS id,CAST(item->>'weight' AS INTEGER) AS weight FROM jsonb_array_elements(CAST(? AS JSONB)) AS item`;
  const sql = `${tree.sql}, captured_power(id,weight) AS (${captured}), career_contracts AS (
    SELECT c.id,c.user_id,c.plan_id,c.snapshot,c.status,c.started_at,c.expires_at,x.cancelled_at,
      t.name AS owner_name,t.level,t.line_id,p.id AS included_id,p.weight AS captured_weight
    FROM career_tree t JOIN contracts c ON c.user_id=t.id AND c.scope=? AND c.is_demo=?
    LEFT JOIN captured_power p ON p.id=c.id
    LEFT JOIN contract_cancellations x ON x.contract_id=c.id
    WHERE p.id IS NOT NULL OR (c.started_at<? AND c.expires_at>? AND (x.cancelled_at IS NULL OR x.cancelled_at>?))
  )`;
  const params: SqlValue[] = [...tree.params, JSON.stringify(power), String(user.scope), Number(user.is_demo), cutoff, from, from];
  const constraints: string[] = [];
  if (input.source === 'own') constraints.push('level=0');
  if (input.source === 'network') constraints.push('level>0');
  if (input.eligibility === 'eligible') constraints.push('included_id IS NOT NULL');
  if (input.eligibility === 'excluded') constraints.push('included_id IS NULL');
  const where = constraints.length ? ` WHERE ${constraints.join(' AND ')}` : '';
  const totalEntries = safeInteger((await tx.get(`${sql} SELECT COUNT(*) AS count FROM career_contracts${where}`, params))?.count);
  const totalPages = Math.max(1, Math.ceil(totalEntries / input.pageSize));
  const page = Math.min(input.page, totalPages);
  const rows = await tx.all(`${sql} SELECT * FROM career_contracts${where} ORDER BY level,started_at DESC,id LIMIT ? OFFSET ?`, [...params, input.pageSize, (page - 1) * input.pageSize]);
  const contracts: CareerContractEvidence[] = rows.map(row => {
    const snapshot = snapshotObject(row.snapshot);
    const plan = snapshot.plan && typeof snapshot.plan === 'object' ? snapshot.plan as Record<string, unknown> : {};
    const included = row.included_id !== null && row.included_id !== undefined;
    const cancelledAt = row.cancelled_at ? String(row.cancelled_at) : null;
    const powerStatus: CareerContractEvidence['powerStatus'] = included ? 'INCLUDED'
      : cancelledAt && cancelledAt < cutoff || row.status === 'CANCELLED' && !cancelledAt ? 'CANCELLED'
        : String(row.started_at) >= cutoff ? 'NOT_STARTED'
          : String(row.expires_at) < cutoff ? 'EXPIRED' : 'EXCLUDED';
    const id = String(row.id), ownerId = String(row.user_id), isSelf = ownerId === String(user.id);
    return {
      id, reference: reference(id), owner: { id: ownerId, name: memberName(String(row.owner_name), isSelf, Number(user.is_demo) === 1), reference: reference(ownerId), level: safeInteger(row.level), isSelf },
      lineId: row.line_id ? String(row.line_id) : null, planId: String(row.plan_id), planName: typeof plan.name === 'string' ? plan.name : String(row.plan_id), coin: typeof plan.coin === 'string' ? plan.coin : '', machine: typeof plan.machine === 'string' ? plan.machine : '',
      weight: safeInteger(plan.powerWeight), contributedPower: included ? safeInteger(row.captured_weight) : 0, included, powerStatus, contractStatus: String(row.status), startedAt: String(row.started_at), expiresAt: String(row.expires_at), cancelledAt, snapshotVersion: nullableNumber(snapshot.version),
    };
  });
  return { contracts, pagination: { page, pageSize: input.pageSize, totalEntries, totalPages } };
}

const awardStatuses = new Set<CareerAwardEvidenceStatus>(['PAID', 'AWAITING_FUNDING', 'SUSPENDED', 'NOT_QUALIFIED']);
function awardEvidence(kind: 'salary' | 'bonus', row: Row | undefined, period: Record<string, unknown> | null, entries: Row[], isDemo: boolean): CareerAwardEvidence {
  const amount = row ? safeInteger(row.amount_cents) : period ? nullableNumber(period[`${kind}Cents`]) : null;
  const candidate = row ? String(row.status) : period ? String(period[`${kind}Status`] ?? '') : 'UNPROCESSED';
  const status: CareerAwardEvidenceStatus = awardStatuses.has(candidate as CareerAwardEvidenceStatus) ? candidate as CareerAwardEvidenceStatus : candidate === 'UNPROCESSED' ? 'UNPROCESSED' : 'UNAVAILABLE';
  const snapshot = row ? snapshotObject(row.snapshot) : {};
  const ledger = entries.filter(entry => entry.kind === (kind === 'salary' ? 'CAREER_SALARY' : 'CAREER_BONUS')).map(entry => ({ id: String(entry.id), amountCents: safeInteger(entry.amount_cents), createdAt: String(entry.created_at), reference: String(entry.reference) }));
  const creditedCents = ledger.reduce((sum, item) => safeInteger(sum + item.amountCents), 0);
  const reasonCode = kind === 'bonus' && typeof snapshot.reason === 'string' ? snapshot.reason : status;
  let explanation = status === 'UNPROCESSED' ? 'A competência não tem fechamento registrado. Nenhum crédito de carreira foi confirmado por esta consulta.'
    : status === 'UNAVAILABLE' ? 'O registro antigo não contém evidência suficiente para detalhar esta remuneração.'
      : status === 'NOT_QUALIFIED' ? kind === 'salary' ? 'Não havia etapa remunerada elegível registrada para esta competência.' : 'O fechamento não registrou um bônus elegível para esta competência.'
        : status === 'SUSPENDED' ? 'A manutenção registrada zerou a remuneração desta competência. A etapa histórica continua preservada.'
          : status === 'AWAITING_FUNDING' ? 'A apuração ficou aguardando financiamento. Não há crédito liberado deste valor no extrato.'
            : isDemo ? 'O fechamento registrou um crédito simulado, vinculado ao fundo da competência.' : 'O fechamento registrou um crédito no extrato, vinculado ao fundo da competência.';
  if (kind === 'salary' && typeof snapshot.maintenanceBps === 'number') explanation += ` Manutenção aplicada: ${snapshot.maintenanceBps / 100}%.`;
  if (status === 'PAID' && amount !== null && amount !== creditedCents) explanation += ' O crédito encontrado no extrato difere do valor apurado; este registro precisa de revisão.';
  if (reasonCode === 'PROMOTION') explanation += ` Motivo registrado: promoção${stageName(snapshot.promotionStage) ? ` para ${stageName(snapshot.promotionStage)}` : ''}.`;
  if (reasonCode === 'PULSE_IMPROVEMENT_MAINTAINED') explanation += ' Motivo registrado: melhora de pelo menos 10 pontos de Pulso mantida no fechamento seguinte.';
  return { amountCents: amount, creditedCents, status, awardId: row ? String(row.id) : null, recordedAt: row ? String(row.created_at) : null, formulaVersion: typeof snapshot.formulaVersion === 'string' ? snapshot.formulaVersion : null, reasonCode, explanation, ledger };
}

/** Own account only. This read never settles periods, creates awards or alters balances. */
export async function careerEvidence(db: Database, requestedUser: Row, input: CareerEvidenceInput, now = Date.now()): Promise<CareerEvidenceData> {
  const bounds = monthBounds(input.month);
  if (new Date(bounds.start).getUTCFullYear() !== Number(input.month.slice(0, 4))) reject(422, 'INVALID_MONTH', 'Competência inválida.');
  if (bounds.start > now) reject(422, 'FUTURE_CAREER_PERIOD', 'A composição pode ser consultada para competências atuais ou anteriores.');
  return db.transaction(async tx => {
    const user = await tx.get('SELECT id,scope,name,is_demo,blocked FROM users WHERE id=? AND scope=? AND is_demo=?', [String(requestedUser.id), String(requestedUser.scope), Number(requestedUser.is_demo)]);
    if (!user || Number(user.blocked) === 1) reject(401, 'AUTH_REQUIRED', 'Entre em uma conta elegível para consultar a carreira.');
    const record = await tx.get('SELECT id,snapshot,formula_version,created_at FROM career_periods WHERE user_id=? AND month=?', [String(user.id), input.month]);
    const period = record ? snapshotObject(record.snapshot) : null;
    const mode: CareerEvidenceData['mode'] = record ? 'CLOSED' : bounds.end > now ? 'IN_PROGRESS' : 'UNPROCESSED';
    const cutoff = record ? bounds.end : Math.min(now, bounds.end);
    const measured = record ? null : await measureCareer(tx, user, input.month, cutoff);
    const source = period ?? measured!;
    const power = capturedPower(source.powerContracts);
    const ownPower = power ? power.filter(contract => contract.line === null).reduce((sum, contract) => sum + contract.weight, 0) : null;
    const networkPower = power ? power.filter(contract => contract.line !== null).reduce((sum, contract) => sum + contract.weight, 0) : null;
    const previousRecord = await tx.get('SELECT snapshot FROM career_periods WHERE user_id=? AND month=?', [String(user.id), addMonths(input.month, -1)]);
    const previous = previousRecord ? snapshotObject(previousRecord.snapshot) : null;
    const proposal = measured ? careerSalaryProposal(previous as unknown as CareerPeriod | null, measured) : null;
    const awards = await tx.all('SELECT id,kind,amount_cents,status,snapshot,created_at FROM career_awards WHERE user_id=? AND scope=? AND month=? ORDER BY created_at,id', [String(user.id), String(user.scope), input.month]);
    const entries = await tx.all(`SELECT l.id,l.kind,l.amount_cents,l.created_at,l.reference FROM ledger_entries l JOIN career_awards a ON a.id=l.reference
      WHERE l.user_id=? AND l.scope=? AND l.is_demo=? AND a.user_id=? AND a.scope=? AND a.month=? AND l.status='CONFIRMED' AND l.kind IN ('CAREER_SALARY','CAREER_BONUS') ORDER BY l.created_at,l.id`, [String(user.id), String(user.scope), Number(user.is_demo), String(user.id), String(user.scope), input.month]);
    const records = await tx.all('SELECT month FROM career_periods WHERE user_id=? ORDER BY month DESC LIMIT 60', [String(user.id)]);
    const currentMonth = iso(now).slice(0, 7);
    const availableMonths = [...new Set([currentMonth, input.month, ...records.map(row => String(row.month))])].sort().reverse();
    const page = power ? await contractPage(tx, db.dialect, user, input, power, iso(bounds.start), iso(cutoff)) : { contracts: [], pagination: { page: 1, pageSize: input.pageSize, totalEntries: 0, totalPages: 1 } };
    const salary = await careerBudget(tx, String(user.scope), input.month, 'salary');
    const bonus = await careerBudget(tx, String(user.scope), input.month, 'bonus');
    const reserve = await careerBudget(tx, String(user.scope), input.month, 'reserve');
    return {
      month: input.month, generatedAt: iso(now), isDemo: Number(user.is_demo) === 1, timezone: 'UTC', cutoffAt: iso(cutoff), mode,
      formulaVersion: record ? String(record.formula_version) : CAREER_VERSION, contractEvidenceAvailable: power !== null,
      closing: record ? { id: String(record.id), recordedAt: String(record.created_at), formulaVersion: String(record.formula_version) } : null,
      availableMonths,
      metrics: { pulse: nullableNumber(source.pulse), power: nullableNumber(source.power), ownPower, networkPower, previousPower: nullableNumber(source.previousPower), retainedPower: nullableNumber(source.retainedPower), completedWeighted: nullableNumber(source.completedWeighted), eligibleWeighted: nullableNumber(source.eligibleWeighted), ownContracts: power ? power.filter(contract => contract.line === null).length : null, networkContracts: power ? power.filter(contract => contract.line !== null).length : null, components: recordedComponents(source.components) },
      qualification: { achievedStage: stageName(period?.stageIndex ?? previous?.stageIndex), payableStage: stageName(period?.payableStageIndex ?? proposal?.payableStageIndex), missedMonths: nullableNumber(period?.missedMonths ?? proposal?.missedMonths), maintenanceBps: nullableNumber(period?.maintenanceBps ?? proposal?.maintenanceBps) },
      salary: awardEvidence('salary', awards.find(award => award.kind === 'salary'), period, entries, Number(user.is_demo) === 1), bonus: awardEvidence('bonus', awards.find(award => award.kind === 'bonus'), period, entries, Number(user.is_demo) === 1),
      funding: { month: input.month, observedAt: iso(now), collective: true, salary, bonus, reserve }, ...page, filters: { source: input.source, eligibility: input.eligibility },
    };
  });
}
