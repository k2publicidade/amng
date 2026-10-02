import { minerAccent } from '../shared/miner-theme.ts';
import type { AdminData, BootstrapData, Miner, MinerStatementData, NetworkData, NetworkMember, Plan, ProductRule, SupportTicket, User, Wallet, WalletId } from '../shared/types.ts';
import type { Database, Executor, Row } from './database.ts';
import { COMMISSIONS, CYCLES, INTEGRATIONS } from './catalog.ts';
import type { PlanSnapshot } from './fixtures.ts';
import { applyBps, balance, DAY, reject } from './domain.ts';
import { careerDTO } from './career.ts';
import { effectiveRole, freshAdministrativeActor, permissionsForUser, userHasPermission } from './authorization.ts';

export function userDTO(row: Row): User {
  return { id:String(row.id),name:String(row.name),email:String(row.email),role:effectiveRole(row),permissions:permissionsForUser(row),isDemo:Number(row.is_demo)===1,twoFactorEnabled:!!row.mfa_secret,referralCode:String(row.referral_code),createdAt:String(row.created_at),status:Number(row.blocked)===1?'BLOCKED':'ACTIVE' };
}
export const planDTO=(p:Row):Plan=>({id:String(p.id),name:String(p.name),coin:String(p.coin),algorithm:String(p.algorithm),machine:String(p.machine),priceCents:Number(p.price_cents),durationDays:Number(p.duration_days),rateBps:Number(p.rate_bps),powerWeight:Number(p.power_weight),color:minerAccent(String(p.id)),image:String(p.image),status:p.status as Plan['status']});
export const ruleDTO=(r:Row):ProductRule=>({id:String(r.id),label:String(r.label),status:r.status as ProductRule['status'],description:String(r.description),source:String(r.source),enabled:Number(r.enabled)===1});
export const ticketDTO=(t:Row):SupportTicket=>({id:String(t.id),subject:String(t.subject),message:String(t.message),status:t.status as SupportTicket['status'],createdAt:String(t.created_at),reply:t.reply ? String(t.reply):null});

/** A consistent, read-only statement; financial settlement is never triggered here. */
export async function minerStatement(db:Database,user:Row,contractId:string,days:number,page:number,now=Date.now()):Promise<MinerStatementData> {
  return db.transaction(async tx=>{
    const contract=await tx.get('SELECT id,is_demo FROM contracts WHERE id=? AND user_id=? AND scope=? AND is_demo=?',[contractId,String(user.id),String(user.scope),Number(user.is_demo)]);
    if(!contract)reject(404,'MINER_NOT_FOUND','Máquina não encontrada nesta conta.');
    const today=new Date(now);today.setUTCHours(0,0,0,0);
    const start=today.getTime()-(days-1)*DAY;
    const until=new Date(today.getTime()+DAY).toISOString();
    const from=new Date(start).toISOString();
    const condition="user_id=? AND scope=? AND reference=? AND is_demo=? AND status='CONFIRMED' AND kind IN ('MINING_INCOME','PROFIT_SHARING') AND created_at>=? AND created_at<?";
    const params=[String(user.id),String(user.scope),contractId,Number(user.is_demo),from,until];
    const integer=(value:unknown)=>{const number=Number(value??0);if(!Number.isSafeInteger(number))throw new Error('Unsafe statement aggregate');return number;};
    const summary=await tx.get(`SELECT COUNT(*) AS count,COALESCE(SUM(CASE WHEN kind='MINING_INCOME' THEN amount_cents ELSE 0 END),0) AS mining,COALESCE(SUM(CASE WHEN kind='PROFIT_SHARING' THEN amount_cents ELSE 0 END),0) AS sharing FROM ledger_entries WHERE ${condition}`,params);
    const daily=await tx.all(`SELECT substr(created_at,1,10) AS day,COALESCE(SUM(CASE WHEN kind='MINING_INCOME' THEN amount_cents ELSE 0 END),0) AS mining,COALESCE(SUM(CASE WHEN kind='PROFIT_SHARING' THEN amount_cents ELSE 0 END),0) AS sharing FROM ledger_entries WHERE ${condition} GROUP BY substr(created_at,1,10) ORDER BY substr(created_at,1,10)`,params);
    const pageSize=12,totalEntries=integer(summary?.count),totalPages=Math.max(1,Math.ceil(totalEntries/pageSize)),currentPage=Math.min(page,totalPages);
    const entries=await tx.all(`SELECT * FROM ledger_entries WHERE ${condition} ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`,[...params,pageSize,(currentPage-1)*pageSize]);
    const byDay=new Map(daily.map(row=>[String(row.day),row]));
    const productionHistory=Array.from({length:days},(_,index)=>{const date=new Date(start+index*DAY).toISOString().slice(0,10);const row=byDay.get(date);return {date,miningCents:integer(row?.mining),sharingCents:integer(row?.sharing)};});
    const miningCents=integer(summary?.mining),sharingCents=integer(summary?.sharing);
    return {
      minerId:contractId,isDemo:Number(contract.is_demo)===1,confirmedOnly:true,generatedAt:new Date(now).toISOString(),
      period:{days,from,until,timezone:'UTC'},productionHistory,
      totals:{miningCents,sharingCents,totalCents:integer(miningCents+sharingCents)},
      ledger:entries.map(entry=>({id:String(entry.id),wallet:entry.wallet as WalletId,amountCents:integer(entry.amount_cents),kind:String(entry.kind),description:String(entry.description),status:'CONFIRMED',createdAt:String(entry.created_at),reference:String(entry.reference),isDemo:Number(entry.is_demo)===1})),
      pagination:{page:currentPage,pageSize,totalPages,totalEntries},
    };
  });
}

export async function network(tx: Executor,user: Row | null,now:number):Promise<NetworkData> {
  const empty:NetworkData={members:[],directCount:0,activeCount:0,totalCount:0,referralCode:user?String(user.referral_code):'',commissionCents:0,commissionRates:COMMISSIONS};
  if(!user)return empty;
  const rows=await tx.all('SELECT id,name,sponsor_id,created_at,blocked FROM users WHERE scope = ? AND sponsor_id IS NOT NULL',[String(user.scope)]);
  const contracts=await tx.all('SELECT user_id,snapshot FROM contracts WHERE scope = ? AND status = ? AND expires_at > ?',[String(user.scope),'ACTIVE',new Date(now).toISOString()]);
  const bySponsor=new Map<string,Row[]>();
  for(const row of rows) {const key=String(row.sponsor_id);bySponsor.set(key,[...(bySponsor.get(key)??[]),row]);}
  const members:NetworkMember[]=[];const seen=new Set<string>([String(user.id)]);
  const queue=[{id:String(user.id),level:0,line:''}];
  while(queue.length&&members.length<1000) {
    const parent=queue.shift()!;if(parent.level>=7)continue;
    for(const row of bySponsor.get(parent.id)??[]) {
      const id=String(row.id);if(seen.has(id))continue;seen.add(id);
      const owned=contracts.filter(c=>c.user_id===id);
      const power=owned.reduce((sum,c)=>sum+(JSON.parse(String(c.snapshot)) as PlanSnapshot).plan.powerWeight,0);
      const line=parent.level===0?id:parent.line;
      const parts=String(row.name).split(' ');
      members.push({id,name:Number(user.is_demo)?String(row.name):`${parts[0]}${parts[1]?` ${parts[1][0]}.`:''}`,sponsorId:String(row.sponsor_id),level:parent.level+1,active:owned.length>0&&Number(row.blocked)===0,contracts:owned.length,power,joinedAt:String(row.created_at),line});
      queue.push({id,level:parent.level+1,line});
    }
  }
  const commission=await tx.get("SELECT COALESCE(SUM(amount_cents),0) AS total FROM ledger_entries WHERE user_id = ? AND wallet = 'affiliate' AND kind IN ('AFFILIATE_COMMISSION','AFFILIATE_REVERSAL','DEMO_AFFILIATE_FIXTURE')",[String(user.id)]);
  return {...empty,members,directCount:members.filter(m=>m.level===1).length,activeCount:members.filter(m=>m.active).length,totalCount:members.length,commissionCents:Number(commission?.total??0)};
}
export async function bootstrap(db:Database,user:Row|null,csrfToken:string,now=Date.now()):Promise<BootstrapData> {
  return db.transaction(async tx=>{
    const scope=user?String(user.scope):'real';
    const plans=(await tx.all('SELECT * FROM plans WHERE scope = ? ORDER BY price_cents',[scope])).map(planDTO);
    const rules=(await tx.all('SELECT * FROM product_rules WHERE scope = ? ORDER BY id',[scope])).map(ruleDTO);
    const contracts=user?await tx.all('SELECT * FROM contracts WHERE user_id = ? ORDER BY started_at DESC',[String(user.id)]):[];
    const miners:Miner[]=[];
    for(const contract of contracts){
      const snapshot=JSON.parse(String(contract.snapshot)) as PlanSnapshot;
      const cycles=await tx.all('SELECT * FROM mining_cycles WHERE contract_id = ? ORDER BY cycle_number DESC',[String(contract.id)]);
      const latest=cycles[0];
      const paused=!!latest&&!latest.settled_at&&!!latest.paused_at;
      const active=!!latest&&!latest.settled_at&&!latest.paused_at&&new Date(String(latest.ends_at)).getTime()>now;
      const expired=new Date(String(contract.expires_at)).getTime()<=now;
      const total=await tx.get("SELECT COALESCE(SUM(amount_cents),0) AS total FROM ledger_entries WHERE user_id=? AND reference=? AND kind='MINING_INCOME'",[String(user!.id),String(contract.id)]);
      miners.push({id:String(contract.id),planId:String(contract.plan_id),planName:snapshot.plan.name,coin:snapshot.plan.coin,machine:snapshot.plan.machine,image:snapshot.plan.image,color:minerAccent(String(contract.plan_id)),principalCents:Number(contract.principal_cents),rateBps:snapshot.plan.rateBps,powerWeight:snapshot.plan.powerWeight,status:contract.status==='CANCELLED'?'CANCELLED':expired?'EXPIRED':paused?'PAUSED':active?'MINING':'READY',startedAt:String(contract.started_at),expiresAt:String(contract.expires_at),cycleStartedAt:active||paused?String(latest.starts_at):null,cycleEndsAt:active||paused?String(latest.ends_at):null,pausedAt:paused?String(latest.paused_at):null,nextActivationAt:active||paused?String(latest.ends_at):expired?null:new Date(now).toISOString(),cycleCount:cycles.filter(c=>!!c.settled_at).length,totalEarnedCents:Number(total?.total??0),cycleEstimatedCents:!expired&&Number(user!.is_demo)?applyBps(Number(contract.principal_cents),snapshot.plan.rateBps):0,allocatedHashrate:null,hashrateUnit:null,hardwareStatus:'UNAVAILABLE',isDemo:Number(contract.is_demo)===1});
    }
    const wallets:Wallet[]=[];
    for(const id of ['deposit','earnings','affiliate'] as WalletId[]){
      const available=user?await balance(tx,String(user.id),id):0;
      const reservation=user?await tx.get("SELECT COALESCE(SUM(amount_cents),0) AS amount FROM payments WHERE user_id=? AND wallet=? AND type='WITHDRAWAL' AND status IN ('PENDING','PROCESSING','REVIEW_REQUIRED')",[String(user.id),id]):undefined;
      const reserved=Number(reservation?.amount??0);
      wallets.push({id,label:{deposit:'Depósitos',earnings:'Rendimentos',affiliate:'Afiliados'}[id],balanceCents:available+reserved,reservedCents:reserved,availableCents:available});
    }
    const ledgerRows=user?await tx.all('SELECT l.*,p.status AS payment_status FROM ledger_entries l LEFT JOIN payments p ON p.id=l.reference WHERE l.user_id=? ORDER BY l.created_at DESC,l.id DESC LIMIT 500',[String(user.id)]):[];
    const ledger:BootstrapData['ledger']=ledgerRows.map(l=>({id:String(l.id),wallet:l.wallet as WalletId,amountCents:Number(l.amount_cents),kind:String(l.kind),description:String(l.description),status:(l.kind==='WITHDRAWAL_RESERVED'&&l.payment_status==='PAID'?'CONFIRMED':l.kind==='WITHDRAWAL_RESERVED'&&l.payment_status==='REJECTED'?'REVERSED':l.status) as BootstrapData['ledger'][number]['status'],createdAt:String(l.created_at),reference:String(l.reference),isDemo:Number(l.is_demo)===1}));
    const net=await network(tx,user,now);const careerData=await careerDTO(tx,user,now);
    const positions=user?await tx.all('SELECT p.*,COALESCE(SUM(a.amount_cents),0) AS earnings FROM market_positions p LEFT JOIN market_accruals a ON a.position_id=p.id WHERE p.user_id=? GROUP BY p.id,p.scope,p.user_id,p.principal_cents,p.status,p.created_at,p.closed_at,p.snapshot,p.is_demo ORDER BY p.created_at DESC',[String(user.id)]):[];
    const productionHistory:BootstrapData['dashboard']['productionHistory']=[];
    const productionRows=user?await tx.all("SELECT substr(created_at,1,10) AS day,COALESCE(SUM(CASE WHEN kind='MINING_INCOME' THEN amount_cents ELSE 0 END),0) AS mining,COALESCE(SUM(CASE WHEN kind='PROFIT_SHARING' THEN amount_cents ELSE 0 END),0) AS sharing FROM ledger_entries WHERE user_id=? AND created_at>=? GROUP BY substr(created_at,1,10)",[String(user.id),new Date(now-30*DAY).toISOString()]):[];
    for(let days=29;days>=0;days--){
      const date=new Date(now-days*DAY).toISOString().slice(0,10);const data=productionRows.find(row=>row.day===date);
      productionHistory.push({date,miningCents:Number(data?.mining??0),sharingCents:Number(data?.sharing??0)});
    }
    const totals=user?await tx.get("SELECT COALESCE(SUM(CASE WHEN kind='MINING_INCOME' THEN amount_cents ELSE 0 END),0) AS mining,COALESCE(SUM(CASE WHEN kind='PROFIT_SHARING' THEN amount_cents ELSE 0 END),0) AS sharing FROM ledger_entries WHERE user_id=?",[String(user.id)]):undefined;
    return {mode:user?(Number(user.is_demo)?'demo':'account'):'public',user:user?userDTO(user):null,csrfToken,plans,wallets,miners,ledger,network:net,career:careerData,marketPositions:positions.map(p=>({id:String(p.id),principalCents:Number(p.principal_cents),earningsCents:Number(p.earnings),createdAt:String(p.created_at),status:p.status as BootstrapData['marketPositions'][number]['status']})),cycles:CYCLES,rules,integrations:INTEGRATIONS,tickets:user?(await tx.all('SELECT * FROM support_tickets WHERE user_id=? ORDER BY created_at DESC',[String(user.id)])).map(ticketDTO):[],dashboard:{todayMiningCents:productionHistory[productionHistory.length-1].miningCents,totalMiningCents:Number(totals?.mining??0),profitSharingCents:Number(totals?.sharing??0),productionHistory,quoteUpdatedAt:null,quotes:plans.map(p=>({coin:p.coin,usd:null}))}};
  });
}

export async function adminOverview(db:Database,user:Row):Promise<AdminData> {
  return db.transaction(async tx=>{
    const actor=await freshAdministrativeActor(tx,user,'admin.access');
    const scope=String(actor.scope), allowed=(permission:Parameters<typeof userHasPermission>[1])=>userHasPermission(actor,permission);
    const users=allowed('accounts.read')?await tx.all('SELECT * FROM users WHERE scope=? ORDER BY created_at DESC',[scope]):[];
    const payments=allowed('payments.read')?await tx.all('SELECT p.*,u.name FROM payments p JOIN users u ON u.id=p.user_id AND u.scope=p.scope WHERE p.scope=? ORDER BY p.created_at DESC,p.id DESC LIMIT 300',[scope]):[];
    const auditRows=allowed('audit.read')?await tx.all('SELECT a.*,u.name FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id AND u.scope=a.scope WHERE a.scope=? ORDER BY a.created_at DESC,a.id DESC LIMIT 300',[scope]):[];
    const coupons=allowed('coupons.read')?await tx.all('SELECT * FROM coupons WHERE scope=? ORDER BY expires_at DESC',[scope]):[];
    const contracts=allowed('contracts.read')?await tx.all(`SELECT c.*,u.name AS user_name,(SELECT MAX(ends_at) FROM mining_cycles mc WHERE mc.contract_id=c.id AND mc.settled_at IS NULL) AS cycle_end,(SELECT MAX(paused_at) FROM mining_cycles mc WHERE mc.contract_id=c.id AND mc.settled_at IS NULL) AS cycle_paused FROM contracts c JOIN users u ON u.id=c.user_id AND u.scope=c.scope AND u.is_demo=c.is_demo WHERE c.scope=? ORDER BY c.started_at DESC,c.id DESC LIMIT 300`,[scope]):[];
    const contractCount=allowed('contracts.read')?await tx.get('SELECT COUNT(*) AS count FROM contracts WHERE scope=?',[scope]):undefined;
    const deposits=allowed('finance.read')?await tx.get("SELECT COALESCE(SUM(amount_cents),0) AS amount FROM payments WHERE scope=? AND type='DEPOSIT' AND status='CONFIRMED'",[scope]):undefined;
    const pending=allowed('payments.read')?await tx.get("SELECT COUNT(*) AS count FROM payments WHERE scope=? AND status IN ('PENDING','PROCESSING','REVIEW_REQUIRED')",[scope]):undefined;
    return {
      actor:userDTO(actor),
      users:users.map(row=>{const dto=userDTO(row);if(row.id!==actor.id&&!allowed('accounts.sensitive.read'))dto.email='';return dto;}),
      contracts:contracts.map(c=>{const snapshot=JSON.parse(String(c.snapshot)) as PlanSnapshot;const cycleEndsAt=c.cycle_end&&String(c.cycle_end)>new Date().toISOString()?String(c.cycle_end):null;return {id:String(c.id),userName:String(c.user_name),machine:snapshot.plan.machine,coin:snapshot.plan.coin,planName:snapshot.plan.name,status:(c.status==='CANCELLED'?'CANCELLED':String(c.expires_at)<=new Date().toISOString()?'EXPIRED':c.cycle_paused&&cycleEndsAt?'PAUSED':cycleEndsAt?'MINING':'READY') as Miner['status'],startedAt:String(c.started_at),expiresAt:String(c.expires_at),cycleEndsAt,hardwareStatus:'UNAVAILABLE' as const,isDemo:Number(c.is_demo)===1};}),
      plans:allowed('products.read')?(await tx.all('SELECT * FROM plans WHERE scope=? ORDER BY price_cents',[scope])).map(planDTO):[],
      rules:allowed('rules.read')?(await tx.all('SELECT * FROM product_rules WHERE scope=? ORDER BY id',[scope])).map(ruleDTO):[],
      integrations:INTEGRATIONS.filter(i=>allowed('integrations.read')||(i.id==='payments'?allowed('integrations.payments.read'):i.id!=='quotes'&&allowed('integrations.mining.read'))),
      audit:auditRows.map(a=>({id:String(a.id),actor:String(a.name??'Sistema'),action:String(a.action),target:String(a.target),details:String(a.details),createdAt:String(a.created_at)})),
      tickets:allowed('tickets.read')?(await tx.all('SELECT t.*,u.name FROM support_tickets t JOIN users u ON u.id=t.user_id AND u.scope=t.scope WHERE t.scope=? ORDER BY t.created_at DESC',[scope])).map(t=>({...ticketDTO(t),userName:String(t.name)})):[],
      payments:payments.map(p=>({id:String(p.id),userName:String(p.name),type:String(p.type),amountCents:Number(p.amount_cents),status:String(p.status),createdAt:String(p.created_at)})),
      coupons:coupons.map(c=>({id:String(c.id),code:String(c.code),discountBps:Number(c.discount_bps),maxUses:Number(c.max_uses),uses:Number(c.uses),expiresAt:String(c.expires_at),active:Number(c.active)===1})),
      totals:{users:allowed('accounts.read')?users.length:null,contracts:contractCount?Number(contractCount.count):null,depositsCents:deposits?Number(deposits.amount):null,pendingPayments:pending?Number(pending.count):null}
    };
  });
}
