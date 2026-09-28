import type { Executor, Row } from './database.ts';
import { COMMISSIONS } from './catalog.ts';
import { applyBps, audit, iso, postLedger, reject, uid } from './domain.ts';

export const AFFILIATE_VERSION='PROPOSAL-DEMO-AFFILIATE-v1';
/** A declared sandbox policy: net contract price, active upline, no compression.
 * Real commissions remain unavailable while their base and eligibility are pending. */
export async function distributeDemoCommissions(tx:Executor,buyer:Row,contract:Row,now=Date.now()) {
  if(Number(buyer.is_demo)!==1)reject(409,'AFFILIATE_RULE_PENDING','Comissões reais não estão homologadas.');
  const earlier=await tx.get('SELECT COUNT(*) AS count FROM contracts WHERE user_id=? AND id<>? AND started_at<=?',[String(buyer.id),String(contract.id),iso(now)]);
  const first=Number(earlier?.count??0)===0;
  const seen=new Set<string>([String(buyer.id)]);let sponsorId=buyer.sponsor_id?String(buyer.sponsor_id):null;
  const results:{level:number;recipientId:string;amountCents:number|null;status:string}[]=[];
  for(let level=1;level<=7&&sponsorId;level++){
    if(seen.has(sponsorId))reject(409,'SPONSOR_CYCLE','A rede contém um vínculo circular e exige revisão.');seen.add(sponsorId);
    const recipient=await tx.get('SELECT * FROM users WHERE id=? AND scope=?',[sponsorId,String(buyer.scope)]);
    if(!recipient)break;
    const config=COMMISSIONS[level-1];const bps=first?config.firstBps:config.recurringBps;
    const eligible=Number(recipient.blocked)===0&&!!await tx.get("SELECT id FROM contracts WHERE user_id=? AND started_at<=? AND expires_at>? AND status<>'CANCELLED' LIMIT 1",[sponsorId,iso(now),iso(now)]);
    const status=bps===null?'PENDING_RATE':!eligible?'INELIGIBLE':'CONFIRMED';
    const amount=bps===null?null:eligible?applyBps(Number(contract.principal_cents),bps):0;
    const existing=await tx.get('SELECT id FROM affiliate_commissions WHERE contract_id=? AND level=?',[String(contract.id),level]);
    if(!existing){
      const id=uid('commission');
      await tx.run('INSERT INTO affiliate_commissions(id,scope,contract_id,buyer_id,recipient_id,level,rate_bps,base_cents,amount_cents,status,snapshot,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
        [id,String(buyer.scope),String(contract.id),String(buyer.id),sponsorId,level,bps,Number(contract.principal_cents),amount,status,JSON.stringify({version:AFFILIATE_VERSION,firstPurchase:first,compression:false,base:'NET_CONTRACT_PRICE',eligibility:'ACTIVE_CONTRACT',isDemo:true}),iso(now)]);
      if(amount)await postLedger(tx,{user:recipient,wallet:'affiliate',amount,key:`${contract.id}:commission:${level}`,kind:'AFFILIATE_COMMISSION',description:`Comissão N${level} · ${first?'primeira compra':'recompra'} simulada`,reference:String(contract.id),createdAt:iso(now),contra:'demo:commission-funding'});
    }
    results.push({level,recipientId:sponsorId,amountCents:amount,status});
    sponsorId=recipient.sponsor_id?String(recipient.sponsor_id):null;
  }
  return results;
}
export async function reverseDemoCommissions(tx:Executor,actor:Row,contractId:string,reason:string,now=Date.now()){
  if(Number(actor.is_demo)!==1)reject(409,'AFFILIATE_RULE_PENDING','Estorno de comissão real aguarda política homologada.');
  const commissions=await tx.all("SELECT * FROM affiliate_commissions WHERE contract_id=? AND scope=? AND status='CONFIRMED'",[contractId,String(actor.scope)]);
  for(const commission of commissions){
    if(await tx.get('SELECT id FROM commission_reversals WHERE commission_id=?',[String(commission.id)]))continue;
    const recipient=await tx.get('SELECT * FROM users WHERE id=?',[String(commission.recipient_id)]);
    await tx.lockUser(String(recipient!.id));
    if(Number(commission.amount_cents)>0)await postLedger(tx,{user:recipient!,wallet:'affiliate',amount:-Number(commission.amount_cents),key:`${commission.id}:reversal`,kind:'AFFILIATE_REVERSAL',description:'Estorno de comissão · simulação',reference:contractId,createdAt:iso(now)});
    await tx.run('INSERT INTO commission_reversals(id,commission_id,reason,created_at) VALUES(?,?,?,?)',[uid('commission_reversal'),String(commission.id),reason,iso(now)]);
  }
  await audit(tx,actor,'DEMO_COMMISSION_REVERSAL',contractId,{reason,isDemo:true,events:commissions.length});
}
