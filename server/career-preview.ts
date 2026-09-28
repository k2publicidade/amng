import type { CareerPreview } from '../shared/types.ts';
import type { Executor, Row } from './database.ts';
import { addMonths, careerBudget, careerSalaryProposal, measureCareer, monthBounds, type CareerPeriod } from './career.ts';

/** Read-only estimate. It creates neither a closing nor a payment. */
export async function careerPreview(tx:Executor,actor:Row,month:string,now=Date.now()):Promise<CareerPreview>{
  const bounds=monthBounds(month);
  const last=await tx.get('SELECT month FROM career_closings WHERE scope=? ORDER BY month DESC LIMIT 1',[String(actor.scope)]);
  const nextMonth=last?addMonths(String(last.month),1):month;
  const closed=!!await tx.get('SELECT id FROM career_closings WHERE scope=? AND month=?',[String(actor.scope),month]);
  const salary=await careerBudget(tx,String(actor.scope),month,'salary');
  const bonus=await careerBudget(tx,String(actor.scope),month,'bonus');
  const reserve=await careerBudget(tx,String(actor.scope),month,'reserve');
  const members=await tx.all('SELECT * FROM users WHERE scope=? ORDER BY created_at,id',[String(actor.scope)]);
  let predictedSalaryCents=0;
  if(closed){
    const awards=await tx.get("SELECT COALESCE(SUM(amount_cents),0) AS total FROM career_awards WHERE scope=? AND month=? AND kind='salary'",[String(actor.scope),month]);
    predictedSalaryCents=Number(awards?.total??0);
  }else{
    for(const member of members){
      const record=await tx.get('SELECT snapshot FROM career_periods WHERE user_id=? AND month=?',[String(member.id),addMonths(month,-1)]);
      const previous=record?JSON.parse(String(record.snapshot)) as CareerPeriod:null;
      const measure=await measureCareer(tx,member,month,Math.min(now,bounds.end));
      predictedSalaryCents+=careerSalaryProposal(previous,measure).salaryCents;
    }
  }
  const awaiting=await tx.get("SELECT COALESCE(SUM(amount_cents),0) AS total FROM career_awards WHERE scope=? AND month=? AND status='AWAITING_FUNDING'",[String(actor.scope),month]);
  return {month,isDemo:Number(actor.is_demo)===1,closed,nextMonth,canClose:Number(actor.is_demo)===1&&bounds.end<=now&&!closed&&nextMonth===month,users:members.length,salary,bonus,reserve,predictedSalaryCents,salaryGapCents:Math.max(0,predictedSalaryCents-salary.fundedCents),awaitingCents:Number(awaiting?.total??0)};
}
