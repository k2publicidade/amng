import type { CareerComponent, CareerData } from '../shared/types.ts';
import type { Executor, Row } from './database.ts';
import type { PlanSnapshot } from './fixtures.ts';
import { STAGES } from './catalog.ts';
import { applyBps, audit, calculatePulse, DAY, iso, postLedger, reject, uid } from './domain.ts';

export const CAREER_VERSION='PROPOSAL-DEMO-CAREER-v1';
export interface CareerPeriod {
  month:string;power:number;pulse:number;components:CareerComponent[];
  powerContracts:{id:string;weight:number;line:string|null}[];
  eligibleWeighted:number;completedWeighted:number;previousPower:number;retainedPower:number;
  stageIndex:number;payableStageIndex:number;missedMonths:number;maintenanceBps:number;
  salaryCents:number;salaryStatus:'PAID'|'AWAITING_FUNDING'|'SUSPENDED'|'NOT_QUALIFIED';
  bonusCents:number;bonusStatus:'PAID'|'AWAITING_FUNDING'|'NOT_QUALIFIED';
  isDemo:true;formulaVersion:string;
}
export function careerSalaryProposal(previous:CareerPeriod|null,measure:Pick<CareerPeriod,'power'|'pulse'>){
  const payableStageIndex=previous?.stageIndex??-1;
  const payableStage=STAGES[payableStageIndex];
  const maintained=!payableStage||measure.power>=payableStage.power&&measure.pulse>=payableStage.pulse;
  const missedMonths=maintained?0:(previous?.missedMonths??0)+1;
  const maintenanceBps=missedMonths<=1?10000:missedMonths===2?5000:0;
  const salaryCents=payableStage?applyBps(payableStage.salaryCents,maintenanceBps):0;
  return {payableStageIndex,payableStage,missedMonths,maintenanceBps,salaryCents};
}
export function monthBounds(month:string){
  if(!/^\d{4}-\d{2}$/.test(month)||Number(month.slice(5))<1||Number(month.slice(5))>12)reject(422,'INVALID_MONTH','Informe a competência no formato AAAA-MM.');
  const [year,index]=month.split('-').map(Number);
  return {start:Date.UTC(year,index-1,1),end:Date.UTC(year,index,1)};
}
export function addMonths(month:string,count:number){const b=monthBounds(month);return new Date(Date.UTC(new Date(b.start).getUTCFullYear(),new Date(b.start).getUTCMonth()+count,1)).toISOString().slice(0,7);}
function splitFive(total:number){return Array.from({length:5},(_,index)=>Math.floor(total/5)+(index<total%5?1:0));}

export async function reserveDemoCareerFunding(tx:Executor,user:Row,contract:Row,now=Date.now()){
  if(Number(user.is_demo)!==1)reject(409,'CAREER_RULE_PENDING','O caixa de carreira real não foi aprovado.');
  const principal=Number(contract.principal_cents);const total=applyBps(principal,500);
  const salary=applyBps(principal,400),bonus=applyBps(principal,75),reserve=total-salary-bonus;
  const purchaseMonth=String(contract.started_at).slice(0,7);
  for(const [bucket,amount] of Object.entries({salary,bonus,reserve})){
    const installments=splitFive(amount);
    for(let index=0;index<5;index++){
      const month=addMonths(purchaseMonth,index+1);const key=`${contract.id}:career:${month}:${bucket}`;
      if(await tx.get('SELECT id FROM career_funding WHERE business_key=?',[key]))continue;
      const amountCents=installments[index];
      await tx.run('INSERT INTO career_funding(id,scope,contract_id,month,bucket,amount_cents,business_key,policy_version,created_at) VALUES(?,?,?,?,?,?,?,?,?)',
        [uid('career_fund'),String(user.scope),String(contract.id),month,bucket,amountCents,key,CAREER_VERSION,iso(now)]);
      if(amountCents){
        const journal=uid('journal');await tx.run('INSERT INTO accounting_journals(id,scope,business_key,created_at,description,is_demo) VALUES(?,?,?,?,?,?)',[journal,String(user.scope),key,iso(now),`Reserva de carreira ${bucket} / ${month} · simulação`,1]);
        for(const [account,cents] of [[`career:${user.scope}:${month}:${bucket}`,amountCents],['demo:career-funding',-amountCents]] as const)await tx.run('INSERT INTO accounting_lines(id,journal_id,account,amount_cents) VALUES(?,?,?,?)',[uid('line'),journal,account,cents]);
      }
    }
  }
  return {totalCents:total,salaryCents:salary,bonusCents:bonus,reserveCents:reserve};
}
export async function careerBudget(tx:Executor,scope:string,month:string,bucket:'salary'|'bonus'|'reserve'){
  const funding=await tx.get('SELECT COALESCE(SUM(f.amount_cents-COALESCE(r.amount_cents,0)),0) AS amount FROM career_funding f LEFT JOIN career_funding_reversals r ON r.funding_id=f.id WHERE f.scope=? AND f.month=? AND f.bucket=?',[scope,month,bucket]);
  const paid=bucket==='reserve'?0:Number((await tx.get("SELECT COALESCE(SUM(amount_cents),0) AS amount FROM career_awards WHERE scope=? AND month=? AND kind=? AND status='PAID'",[scope,month,bucket]))?.amount??0);
  return {fundedCents:Number(funding?.amount??0),paidCents:paid,availableCents:Number(funding?.amount??0)-paid};
}
async function scopeContracts(tx:Executor,user:Row):Promise<(Row&{line:string|null})[]>{
  const users=await tx.all('SELECT id,sponsor_id FROM users WHERE scope=?',[String(user.scope)]);
  const descendants=new Map<string,string|null>([[String(user.id),null]]);const queue=[{id:String(user.id),line:null as string|null,level:0}];
  while(queue.length){const parent=queue.shift()!;if(parent.level>=7)continue;for(const child of users.filter(u=>u.sponsor_id===parent.id)){const id=String(child.id);if(descendants.has(id))reject(409,'SPONSOR_CYCLE','Rede circular na apuração da carreira.');const line=parent.level===0?id:parent.line;descendants.set(id,line);queue.push({id,line,level:parent.level+1});}}
  const all=await tx.all('SELECT c.*,x.cancelled_at FROM contracts c LEFT JOIN contract_cancellations x ON x.contract_id=c.id WHERE c.scope=?',[String(user.scope)]);
  return all.filter(c=>descendants.has(String(c.user_id))).map(c=>({...c,line:descendants.get(String(c.user_id))??null} as Row&{line:string|null}));
}
export async function measureCareer(tx:Executor,user:Row,month:string,cutoff?:number):Promise<Pick<CareerPeriod,'power'|'pulse'|'components'|'powerContracts'|'eligibleWeighted'|'completedWeighted'|'previousPower'|'retainedPower'>>{
  const bounds=monthBounds(month);const end=Math.min(cutoff??bounds.end,bounds.end);
  const contracts=await scopeContracts(tx,user);const previousMonth=addMonths(month,-1);
  const previousRecord=await tx.get('SELECT snapshot FROM career_periods WHERE user_id=? AND month=?',[String(user.id),previousMonth]);
  const previous=previousRecord?JSON.parse(String(previousRecord.snapshot)) as Partial<CareerPeriod>:null;
  const live=contracts.filter(c=>new Date(String(c.started_at)).getTime()<end&&new Date(String(c.expires_at)).getTime()>=end&&(!c.cancelled_at||new Date(String(c.cancelled_at)).getTime()>=end)&&!(c.status==='CANCELLED'&&!c.cancelled_at));
  const powerContracts=live.map(c=>({id:String(c.id),weight:(JSON.parse(String(c.snapshot)) as PlanSnapshot).plan.powerWeight,line:c.line}));
  const power=powerContracts.reduce((sum,c)=>sum+c.weight,0);
  const retainedPower=(previous?.powerContracts??[]).filter(c=>powerContracts.some(current=>current.id===c.id)).reduce((sum,c)=>sum+c.weight,0);
  let eligibleWeighted=0,completedWeighted=0;const lines=new Map<string,number>();
  for(const contract of contracts){
    const weight=(JSON.parse(String(contract.snapshot)) as PlanSnapshot).plan.powerWeight;
    const started=new Date(String(contract.started_at)).getTime();let expired=Math.min(new Date(String(contract.expires_at)).getTime(),end);
    if(contract.cancelled_at)expired=Math.min(expired,new Date(String(contract.cancelled_at)).getTime());
    if(contract.status==='CANCELLED'&&!contract.cancelled_at)continue;
    if(started>=expired||expired<=bounds.start)continue;
    const priorDue=Math.max(0,Math.floor((bounds.start-started)/DAY));const due=Math.max(0,Math.floor((expired-started)/DAY));
    eligibleWeighted+=Math.max(0,due-priorDue)*weight;
    const count=await tx.get('SELECT COUNT(*) AS count FROM mining_cycles WHERE contract_id=? AND settled_at IS NOT NULL AND ends_at>? AND ends_at<=?',[String(contract.id),iso(Math.max(bounds.start,started)),iso(expired)]);
    completedWeighted+=Number(count?.count??0)*weight;
  }
  for(const contract of powerContracts)if(contract.line)lines.set(contract.line,(lines.get(contract.line)??0)+contract.weight);
  const previousPower=previous?.power??0;
  const components=calculatePulse({power,previousPower,retainedPower,eligibleWeighted,completedWeighted,lines:[...lines.values()]});
  return {power,pulse:components.reduce((sum,c)=>sum+c.score,0),components,powerContracts,eligibleWeighted,completedWeighted,previousPower,retainedPower};
}

export async function closeDemoCareer(tx:Executor,actor:Row,month:string,now=Date.now()){
  if(Number(actor.is_demo)!==1)reject(409,'CAREER_RULE_PENDING','Fechamento real aguarda aprovação de regras, funding e jurisdição.');
  const bounds=monthBounds(month);if(bounds.end>now)reject(409,'PERIOD_OPEN','Esta competência ainda não foi encerrada no calendário UTC da simulação.');
  await tx.lockUser(String(actor.id));
  const existing=await tx.get('SELECT id,snapshot FROM career_closings WHERE scope=? AND month=?',[String(actor.scope),month]);
  if(existing)return {id:String(existing.id),...JSON.parse(String(existing.snapshot)) as {users:number;salaryPaidCents:number;bonusPaidCents:number;awaitingFunding:number}};
  const later=await tx.get('SELECT month FROM career_closings WHERE scope=? AND month>? LIMIT 1',[String(actor.scope),month]);
  if(later)reject(409,'HISTORICAL_CLOSE_LOCKED','Uma competência posterior já foi fechada. Reabertura exige revisão histórica específica.');
  const latest=await tx.get('SELECT month FROM career_closings WHERE scope=? ORDER BY month DESC LIMIT 1',[String(actor.scope)]);
  if(latest&&month!==addMonths(String(latest.month),1))reject(409,'CAREER_MONTH_SEQUENCE',`Feche primeiro a competência ${addMonths(String(latest.month),1)} para preservar a sequência da carreira.`);
  const members=await tx.all('SELECT * FROM users WHERE scope=? ORDER BY created_at,id',[String(actor.scope)]);
  const summary={users:members.length,salaryPaidCents:0,bonusPaidCents:0,awaitingFunding:0};
  for(const user of members){
    await tx.lockUser(String(user.id));
    const previousRecord=await tx.get('SELECT snapshot FROM career_periods WHERE user_id=? AND month=?',[String(user.id),addMonths(month,-1)]);
    const previous=previousRecord?JSON.parse(String(previousRecord.snapshot)) as CareerPeriod:null;
    const beforePreviousRecord=await tx.get('SELECT snapshot FROM career_periods WHERE user_id=? AND month=?',[String(user.id),addMonths(month,-2)]);
    const beforePrevious=beforePreviousRecord?JSON.parse(String(beforePreviousRecord.snapshot)) as CareerPeriod:null;
    const measure=await measureCareer(tx,user,month);
    const {payableStageIndex,payableStage,missedMonths,maintenanceBps,salaryCents}=careerSalaryProposal(previous,measure);let stageIndex=payableStageIndex;
    for(let index=0;index<STAGES.length;index++){const stage=STAGES[index];if(previous&&measure.power>=stage.power&&measure.pulse>=stage.pulse&&previous.power>=stage.power&&previous.pulse>=stage.pulse)stageIndex=Math.max(stageIndex,index);}
    let salaryStatus:CareerPeriod['salaryStatus']=payableStage?salaryCents?'AWAITING_FUNDING':'SUSPENDED':'NOT_QUALIFIED';
    if(salaryCents){
      const budget=await careerBudget(tx,String(actor.scope),month,'salary');
      const paid=Number(user.blocked)===0&&budget.availableCents>=salaryCents;
      salaryStatus=paid?'PAID':'AWAITING_FUNDING';
      const id=uid('salary');const key=`${user.id}:career:${month}:salary`;
      await tx.run('INSERT INTO career_awards(id,scope,user_id,month,kind,amount_cents,status,business_key,snapshot,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
        [id,String(actor.scope),String(user.id),month,'salary',salaryCents,salaryStatus,key,JSON.stringify({stageIndex:payableStageIndex,maintenanceBps,formulaVersion:CAREER_VERSION,fundedWindow:month,isDemo:true}),iso(now)]);
      if(paid){await postLedger(tx,{user,wallet:'affiliate',amount:salaryCents,key,kind:'CAREER_SALARY',description:`Salário ${payableStage.name} / ${month} · simulação financiada`,reference:id,createdAt:iso(now),contra:`career:${actor.scope}:${month}:salary`});summary.salaryPaidCents+=salaryCents;}
      else summary.awaitingFunding++;
    }
    let bonusCents=0;let bonusReason='';
    if(stageIndex>payableStageIndex){
      const earlierBonus=await tx.get("SELECT id FROM career_awards WHERE user_id=? AND kind='bonus' AND snapshot LIKE ? LIMIT 1",[String(user.id),`%"promotionStage":${stageIndex}%`]);
      if(!earlierBonus){bonusCents=1500;bonusReason='PROMOTION';}
    }
    if(!bonusCents&&previous&&beforePrevious&&previous.pulse-beforePrevious.pulse>=10&&measure.pulse>=previous.pulse){bonusCents=500;bonusReason='PULSE_IMPROVEMENT_MAINTAINED';}
    let bonusStatus:CareerPeriod['bonusStatus']=bonusCents?'AWAITING_FUNDING':'NOT_QUALIFIED';
    if(bonusCents){
      const budget=await careerBudget(tx,String(actor.scope),month,'bonus');const paid=Number(user.blocked)===0&&budget.availableCents>=bonusCents;
      bonusStatus=paid?'PAID':'AWAITING_FUNDING';const id=uid('bonus'),key=`${user.id}:career:${month}:bonus`;
      await tx.run('INSERT INTO career_awards(id,scope,user_id,month,kind,amount_cents,status,business_key,snapshot,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
        [id,String(actor.scope),String(user.id),month,'bonus',bonusCents,bonusStatus,key,JSON.stringify({reason:bonusReason,promotionStage:bonusReason==='PROMOTION'?stageIndex:null,formulaVersion:CAREER_VERSION,isDemo:true}),iso(now)]);
      if(paid){await postLedger(tx,{user,wallet:'affiliate',amount:bonusCents,key,kind:'CAREER_BONUS',description:`Bônus de carreira / ${month} · simulação financiada`,reference:id,createdAt:iso(now),contra:`career:${actor.scope}:${month}:bonus`});summary.bonusPaidCents+=bonusCents;}
    }
    const period:CareerPeriod={month,...measure,stageIndex,payableStageIndex,missedMonths,maintenanceBps,salaryCents,salaryStatus,bonusCents,bonusStatus,isDemo:true,formulaVersion:CAREER_VERSION};
    await tx.run('INSERT INTO career_periods(id,user_id,month,snapshot,formula_version,created_at) VALUES(?,?,?,?,?,?)',[uid('career'),String(user.id),month,JSON.stringify(period),CAREER_VERSION,iso(now)]);
  }
  const id=uid('closing');await tx.run('INSERT INTO career_closings(id,scope,month,actor_id,snapshot,formula_version,created_at) VALUES(?,?,?,?,?,?,?)',[id,String(actor.scope),month,String(actor.id),JSON.stringify(summary),CAREER_VERSION,iso(now)]);
  await audit(tx,actor,'DEMO_CAREER_CLOSED',id,{month,...summary,formulaVersion:CAREER_VERSION,isDemo:true});return {id,...summary};
}

export async function careerDTO(tx:Executor,user:Row|null,now=Date.now()):Promise<CareerData>{
  const month=iso(now).slice(0,7);const bounds=monthBounds(month);
  const zero=calculatePulse({power:0,previousPower:0,retainedPower:0,completedWeighted:0,eligibleWeighted:0,lines:[]});
  if(!user)return {pulse:0,power:0,stage:null,nextStage:'IGNITION',nextPulse:45,nextPower:20,confirmedSalaryCents:0,proposedSalaryCents:0,qualificationMonths:0,components:zero,history:[],stages:STAGES,status:'PROPOSAL',nextClosingAt:iso(bounds.end),lastClosedMonth:null,ownPower:0,networkPower:0,salaryStatus:'NOT_QUALIFIED',maintenanceBps:10000,bonusCents:0,bonusStatus:'NOT_QUALIFIED',funding:{month,salaryFundedCents:0,salaryPaidCents:0,salaryAvailableCents:0,bonusFundedCents:0,bonusPaidCents:0,bonusAvailableCents:0,reserveCents:0}};
  const measure=await measureCareer(tx,user,month,now);
  const records=await tx.all('SELECT month,snapshot FROM career_periods WHERE user_id=? ORDER BY month',[String(user.id)]);
  const latest=records.length?JSON.parse(String(records[records.length-1].snapshot)) as CareerPeriod:null;
  const stage=STAGES[latest?.stageIndex??-1];const next=STAGES[Math.min((latest?.stageIndex??-1)+1,STAGES.length-1)];
  const salaryBudget=await careerBudget(tx,String(user.scope),month,'salary');
  const bonusBudget=await careerBudget(tx,String(user.scope),month,'bonus');
  const reserveBudget=await careerBudget(tx,String(user.scope),month,'reserve');
  const funded=!!stage&&salaryBudget.availableCents>=stage.salaryCents;
  let qualificationMonths=0;let expectedMonth=addMonths(month,-1);
  for(const record of [...records].reverse()){
    const p=JSON.parse(String(record.snapshot)) as CareerPeriod;
    if(record.month!==expectedMonth||p.power<next.power||p.pulse<next.pulse)break;
    qualificationMonths++;expectedMonth=addMonths(expectedMonth,-1);if(qualificationMonths===2)break;
  }
  const confirmedSalaryCents=latest?.salaryStatus==='PAID'?latest.salaryCents:0;
  const ownPower=measure.powerContracts.filter(c=>c.line===null).reduce((sum,c)=>sum+c.weight,0);
  return {pulse:measure.pulse,power:measure.power,stage:stage?.name??null,nextStage:next.name,nextPulse:next.pulse,nextPower:next.power,confirmedSalaryCents,proposedSalaryCents:stage?.salaryCents??0,qualificationMonths,components:measure.components,history:records.map(r=>{const p=JSON.parse(String(r.snapshot)) as CareerPeriod;return {month:String(r.month),pulse:p.pulse,power:p.power};}),stages:STAGES,status:confirmedSalaryCents?'CONFIRMED':stage&&!funded?'AWAITING_FUNDING':'PROPOSAL',nextClosingAt:iso(bounds.end),lastClosedMonth:records.length?String(records[records.length-1].month):null,ownPower,networkPower:measure.power-ownPower,salaryStatus:latest?.salaryStatus??'NOT_QUALIFIED',maintenanceBps:latest?.maintenanceBps??10000,bonusCents:latest?.bonusCents??0,bonusStatus:latest?.bonusStatus??'NOT_QUALIFIED',funding:{month,salaryFundedCents:salaryBudget.fundedCents,salaryPaidCents:salaryBudget.paidCents,salaryAvailableCents:salaryBudget.availableCents,bonusFundedCents:bonusBudget.fundedCents,bonusPaidCents:bonusBudget.paidCents,bonusAvailableCents:bonusBudget.availableCents,reserveCents:reserveBudget.availableCents}};
}
