import type { Executor, Row } from './database.ts';
import { applyBps, audit, DAY, idempotent, iso, postLedger, reject, requireFinancialRule, uid } from './domain.ts';
import { planDTO } from './queries.ts';
import type { PlanSnapshot } from './fixtures.ts';
import type { WalletId } from '../shared/types.ts';
import { distributeDemoCommissions } from './affiliate.ts';
import { reserveDemoCareerFunding } from './career.ts';

export async function purchase(tx:Executor,user:Row,input:{planId:string;couponCode?:string;idempotencyKey:string},now=Date.now()) {
  return idempotent(tx,user,'purchase',input.idempotencyKey,{planId:input.planId,couponCode:input.couponCode?.toUpperCase()??null},async()=>{
    await requireFinancialRule(tx,user,'cloud-purchases');
    const record=await tx.get('SELECT * FROM plans WHERE scope=? AND id=?',[String(user.scope),input.planId]);
    if(!record)reject(404,'PLAN_NOT_FOUND','Plano não encontrado.');
    if(record.status==='PAUSED')reject(409,'PLAN_PAUSED','As contratações deste plano estão pausadas.');
    const plan=planDTO(record);let discount=0;let coupon:Row|undefined;
    if(input.couponCode){
      coupon=await tx.get('SELECT * FROM coupons WHERE scope=? AND code=?',[String(user.scope),input.couponCode.toUpperCase()]);
      if(!coupon||Number(coupon.active)!==1||Number(coupon.uses)>=Number(coupon.max_uses)||new Date(String(coupon.expires_at)).getTime()<=now)reject(409,'COUPON_UNAVAILABLE','Cupom inválido, expirado ou sem usos disponíveis.');
      discount=applyBps(plan.priceCents,Number(coupon.discount_bps));
    }
    const paid=plan.priceCents-discount;const id=uid('miner');
    const snapshot:PlanSnapshot={plan,version:Number(record.version),currency:'USD',termsVersion:'DEMO-2026-09',calculation:'DEMO_SIMPLE_FLOOR',principalReturn:'NOT_DEFINED',profitSharingBps:100,isDemo:true};
    const fullSnapshot={...snapshot,paidCents:paid,discountCents:discount,couponCode:input.couponCode??null,approvedBy:'DEMO_SANDBOX'};
    await postLedger(tx,{user,wallet:'deposit',amount:-paid,key:`${id}:purchase`,kind:'CLOUD_PURCHASE',description:`${plan.name} · contratação simulada`,reference:id,createdAt:iso(now)});
    await tx.run('INSERT INTO contracts(id,scope,user_id,plan_id,principal_cents,snapshot,status,started_at,expires_at,purchased_key,is_demo) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
      [id,String(user.scope),String(user.id),plan.id,paid,JSON.stringify(fullSnapshot),'ACTIVE',iso(now),iso(now+plan.durationDays*DAY),`${user.id}:purchase:${input.idempotencyKey}`,1]);
    const contract=await tx.get('SELECT * FROM contracts WHERE id=?',[id]);
    await distributeDemoCommissions(tx,user,contract!,now);
    await reserveDemoCareerFunding(tx,user,contract!,now);
    if(coupon){
      const updated=await tx.run('UPDATE coupons SET uses=uses+1 WHERE id=? AND uses<max_uses',[String(coupon.id)]);
      if(updated.changes!==1)reject(409,'COUPON_UNAVAILABLE','Cupom sem usos disponíveis.');
      await tx.run('INSERT INTO coupon_redemptions(id,coupon_id,contract_id,user_id,discount_cents) VALUES(?,?,?,?,?)',[uid('redemption'),String(coupon.id),id,String(user.id),discount]);
    }
    await audit(tx,user,'CONTRACT_PURCHASED',id,{paidCents:paid,planId:plan.id,planVersion:Number(record.version),discountCents:discount,isDemo:true});
    return id;
  });
}

export async function processDemo(tx:Executor,user:Row,now=Date.now()) {
  if(Number(user.is_demo)!==1)return {miningCycles:0,profitSharingDays:0,marketDays:0,payments:0};
  await tx.lockUser(String(user.id));
  const stats={miningCycles:0,profitSharingDays:0,marketDays:0,payments:0};
  const contracts=await tx.all('SELECT * FROM contracts WHERE user_id=? AND status=?',[String(user.id),'ACTIVE']);
  for(const contract of contracts){
    const snapshot=JSON.parse(String(contract.snapshot)) as PlanSnapshot;
    const cycles=await tx.all('SELECT * FROM mining_cycles WHERE contract_id=? AND settled_at IS NULL AND ends_at<=? ORDER BY cycle_number',[String(contract.id),iso(now)]);
    for(const cycle of cycles){
      const earning=applyBps(Number(contract.principal_cents),snapshot.plan.rateBps);
      if(earning)await postLedger(tx,{user,wallet:'earnings',amount:earning,key:`${contract.id}:mining:${cycle.cycle_number}`,kind:'MINING_INCOME',description:`${snapshot.plan.coin} · ciclo ${cycle.cycle_number} simulado`,reference:String(contract.id),createdAt:String(cycle.ends_at)});
      await tx.run('UPDATE mining_cycles SET settled_at=?,earned_cents=? WHERE id=? AND settled_at IS NULL',[iso(now),earning,String(cycle.id)]);stats.miningCycles++;
    }
    if(snapshot.profitSharingBps!==null){
      const start=new Date(String(contract.started_at)).getTime();const expiry=new Date(String(contract.expires_at)).getTime();
      const due=Math.min(snapshot.plan.durationDays,Math.floor((Math.min(now,expiry)-start)/DAY));
      for(let day=1;day<=due;day++){
        const key=`${contract.id}:sharing:${day}`;
        if(await tx.get('SELECT id FROM ledger_entries WHERE business_key=?',[key]))continue;
        const date=iso(start+day*DAY).slice(0,10);
        const configured=await tx.get('SELECT rate_bps FROM profit_sharing_rates WHERE scope=? AND date<=? ORDER BY date DESC LIMIT 1',[String(user.scope),date]);
        const bps=Number(configured?.rate_bps??snapshot.profitSharingBps);const earning=applyBps(Number(contract.principal_cents),bps);
        if(earning)await postLedger(tx,{user,wallet:'earnings',amount:earning,key,kind:'PROFIT_SHARING',description:`${snapshot.plan.name} · participação simulada (${bps} bps)`,reference:String(contract.id),createdAt:iso(start+day*DAY)});
        stats.profitSharingDays++;
      }
    }
    if(new Date(String(contract.expires_at)).getTime()<=now)await tx.run("UPDATE contracts SET status='EXPIRED' WHERE id=? AND status='ACTIVE'",[String(contract.id)]);
  }
  for(const position of await tx.all("SELECT * FROM market_positions WHERE user_id=? AND status='ACTIVE'",[String(user.id)])){
    const snapshot=JSON.parse(String(position.snapshot)) as {rateBps:number};
    const due=Math.floor((now-new Date(String(position.created_at)).getTime())/DAY);
    const last=await tx.get('SELECT COALESCE(MAX(period),0) AS period FROM market_accruals WHERE position_id=?',[String(position.id)]);
    for(let period=Number(last?.period??0)+1;period<=Math.min(due,3650);period++){
      await tx.run('INSERT INTO market_accruals(id,position_id,period,amount_cents,created_at) VALUES(?,?,?,?,?)',[uid('accrual'),String(position.id),period,applyBps(Number(position.principal_cents),snapshot.rateBps),iso(new Date(String(position.created_at)).getTime()+period*DAY)]);stats.marketDays++;
    }
  }
  return stats;
}

export async function activate(tx:Executor,user:Row,id:string,now=Date.now()){
  await tx.lockUser(String(user.id));
  await requireFinancialRule(tx,user,'mining-income');
  const contract=await tx.get('SELECT * FROM contracts WHERE id=? AND user_id=? AND scope=?',[id,String(user.id),String(user.scope)]);
  if(!contract)reject(404,'MINER_NOT_FOUND','Máquina não encontrada.');
  const expiry=new Date(String(contract.expires_at)).getTime();
  if(contract.status!=='ACTIVE')reject(409,'CONTRACT_EXPIRED','Contrato indisponível para ativação.');
  await processDemo(tx,user,now);
  const latest=await tx.get('SELECT * FROM mining_cycles WHERE contract_id=? ORDER BY cycle_number DESC LIMIT 1',[id]);
  if(latest&&!latest.settled_at&&new Date(String(latest.ends_at)).getTime()>now)return String(latest.id);
  if(now+DAY>expiry)reject(409,'CONTRACT_EXPIRED','Contrato sem período completo elegível para uma nova ativação.');
  const cycle=uid('cycle');const number=Number(latest?.cycle_number??0)+1;
  await tx.run('INSERT INTO mining_cycles(id,contract_id,cycle_number,starts_at,ends_at) VALUES(?,?,?,?,?)',[cycle,id,number,iso(now),iso(now+DAY)]);
  await audit(tx,user,'MINING_CYCLE_ACTIVATED',id,{cycleId:cycle,cycleNumber:number,endsAt:iso(now+DAY),isDemo:true});
  return cycle;
}

export async function deposit(tx:Executor,user:Row,input:{amountCents:number;idempotencyKey:string},now=Date.now()){
  return idempotent(tx,user,'deposit',input.idempotencyKey,{amountCents:input.amountCents},async()=>{
    await requireFinancialRule(tx,user,'deposits');
    const id=uid('payment');
    await tx.run('INSERT INTO payments(id,scope,user_id,type,amount_cents,net_cents,wallet,status,provider,created_at,updated_at,is_demo,request_key) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id,String(user.scope),String(user.id),'DEPOSIT',input.amountCents,input.amountCents,'deposit','CONFIRMED','DEMO_SIMULATOR',iso(now),iso(now),1,`${user.id}:deposit:${input.idempotencyKey}`]);
    await tx.run('INSERT INTO payment_events(id,payment_id,event_key,state,description,created_at) VALUES(?,?,?,?,?,?)',[uid('payment_event'),id,`${id}:confirmed`,'CONFIRMED','Simulação local: nenhum pagamento externo criado',iso(now)]);
    await postLedger(tx,{user,wallet:'deposit',amount:input.amountCents,key:`${id}:deposit`,kind:'DEMO_DEPOSIT',description:'Depósito simulado · sem cobrança externa',reference:id,createdAt:iso(now)});
    await audit(tx,user,'DEMO_DEPOSIT_CONFIRMED',id,{amountCents:input.amountCents,isDemo:true});return id;
  });
}

export async function withdrawal(tx:Executor,user:Row,input:{wallet:WalletId;amountCents:number;idempotencyKey:string},now=Date.now()){
  return idempotent(tx,user,'withdrawal',input.idempotencyKey,{wallet:input.wallet,amountCents:input.amountCents},async()=>{
    await requireFinancialRule(tx,user,'withdrawals');
    if(input.wallet==='deposit')reject(409,'WALLET_RESTRICTED','Deposit Wallet é destinada a contratações.');
    const id=uid('payment');
    await postLedger(tx,{user,wallet:input.wallet,amount:-input.amountCents,key:`${id}:reserve`,kind:'WITHDRAWAL_RESERVED',description:'Reserva de saque simulado · nenhum envio externo',reference:id,status:'RESERVED',createdAt:iso(now)});
    await tx.run('INSERT INTO payments(id,scope,user_id,type,amount_cents,net_cents,wallet,status,provider,created_at,updated_at,is_demo,request_key) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id,String(user.scope),String(user.id),'WITHDRAWAL',input.amountCents,input.amountCents,input.wallet,'PENDING','DEMO_SIMULATOR',iso(now),iso(now),1,`${user.id}:withdrawal:${input.idempotencyKey}`]);
    await tx.run('INSERT INTO payment_events(id,payment_id,event_key,state,description,created_at) VALUES(?,?,?,?,?,?)',[uid('payment_event'),id,`${id}:reserved`,'PENDING','Reserva local de demonstração; tarifa simulada de zero',iso(now)]);
    await audit(tx,user,'DEMO_WITHDRAWAL_RESERVED',id,{wallet:input.wallet,amountCents:input.amountCents,feeCents:0,isDemo:true});return id;
  });
}

export async function convert(tx:Executor,user:Row,input:{from:WalletId;amountCents:number;idempotencyKey:string},now=Date.now()){
  return idempotent(tx,user,'conversion',input.idempotencyKey,{from:input.from,amountCents:input.amountCents},async()=>{
    await requireFinancialRule(tx,user,'conversions');
    if(input.from==='deposit')reject(422,'INVALID_WALLET','Selecione Earnings Wallet ou Affiliate Wallet.');
    const id=uid('conversion');
    await postLedger(tx,{user,wallet:input.from,amount:-input.amountCents,key:`${id}:debit`,kind:'CONVERSION_OUT',description:'Transferência interna simulada · 1:1',reference:id,createdAt:iso(now),contra:`transfer:${id}`});
    await postLedger(tx,{user,wallet:'deposit',amount:input.amountCents,key:`${id}:credit`,kind:'CONVERSION_IN',description:'Transferência para contratações · simulação 1:1',reference:id,createdAt:iso(now),contra:`transfer:${id}`});
    await audit(tx,user,'DEMO_WALLET_CONVERSION',id,{from:input.from,to:'deposit',amountCents:input.amountCents,isDemo:true});return id;
  });
}

export async function openMarket(tx:Executor,user:Row,input:{amountCents:number;idempotencyKey:string},now=Date.now()){
  return idempotent(tx,user,'market-entry',input.idempotencyKey,{amountCents:input.amountCents},async()=>{
    await requireFinancialRule(tx,user,'market');
    if(input.amountCents<2500)reject(422,'MARKET_MINIMUM','A entrada mínima documentada é US$ 25.');
    const id=uid('position');
    await postLedger(tx,{user,wallet:'deposit',amount:-input.amountCents,key:`${id}:entry`,kind:'MARKET_ENTRY',description:'Hashrate Market · alocação simulada',reference:id,createdAt:iso(now),contra:`market:${id}:principal`});
    await tx.run('INSERT INTO market_positions(id,scope,user_id,principal_cents,status,created_at,snapshot,is_demo) VALUES(?,?,?,?,?,?,?,?)',
      [id,String(user.scope),String(user.id),input.amountCents,'ACTIVE',iso(now),JSON.stringify({rateBps:40,calculation:'DEMO_SIMPLE_FLOOR',currency:'USD',isDemo:true}),1]);
    await audit(tx,user,'DEMO_MARKET_ENTRY',id,{amountCents:input.amountCents,isDemo:true});return id;
  });
}

export async function closeMarket(tx:Executor,user:Row,id:string,key:string,now=Date.now()){
  return idempotent(tx,user,'market-withdrawal',key,{id},async()=>{
    await requireFinancialRule(tx,user,'market');
    const position=await tx.get('SELECT * FROM market_positions WHERE id=? AND user_id=?',[id,String(user.id)]);
    if(!position)reject(404,'POSITION_NOT_FOUND','Posição não encontrada.');
    if(position.status!=='ACTIVE')reject(409,'POSITION_CLOSED','Esta posição já foi encerrada.');
    await processDemo(tx,user,now);
    const accrued=await tx.get('SELECT COALESCE(SUM(amount_cents),0) AS amount FROM market_accruals WHERE position_id=?',[id]);
    await postLedger(tx,{user,wallet:'deposit',amount:Number(position.principal_cents),key:`${id}:principal-return`,kind:'MARKET_PRINCIPAL_RETURN',description:'Retirada de principal · simulação',reference:id,createdAt:iso(now),contra:`market:${id}:principal`});
    if(Number(accrued?.amount??0)>0)await postLedger(tx,{user,wallet:'earnings',amount:Number(accrued!.amount),key:`${id}:earnings-release`,kind:'MARKET_EARNINGS',description:'Resultado do Hashrate Market · simulação',reference:id,createdAt:iso(now)});
    await tx.run("UPDATE market_positions SET status='CLOSED',closed_at=? WHERE id=?",[iso(now),id]);
    await audit(tx,user,'DEMO_MARKET_WITHDRAWAL',id,{principalCents:Number(position.principal_cents),earningsCents:Number(accrued?.amount??0),isDemo:true});return id;
  });
}

export async function reconcilePayment(tx:Executor,admin:Row,id:string,input:{status:string;reference?:string},now=Date.now()){
  const payment=await tx.get('SELECT * FROM payments WHERE id=? AND scope=?',[id,String(admin.scope)]);
  if(!payment)reject(404,'PAYMENT_NOT_FOUND','Pagamento não encontrado.');
  await tx.lockUser(String(payment.user_id));
  const current=await tx.get('SELECT * FROM payments WHERE id=?',[id]);
  if(current!.status===input.status)return;
  const transitions:Record<string,string[]>={PENDING:['PROCESSING','REVIEW_REQUIRED','PAID','REJECTED'],PROCESSING:['REVIEW_REQUIRED','PAID','REJECTED'],REVIEW_REQUIRED:['PAID','REJECTED']};
  if(!transitions[String(current!.status)]?.includes(input.status))reject(409,'INVALID_PAYMENT_TRANSITION','Transição incompatível com o estado financeiro atual.');
  if(Number(current!.is_demo)!==1&&input.status!=='REVIEW_REQUIRED')reject(409,'PROVIDER_EVIDENCE_REQUIRED','A conciliação financeira real exige evidência autenticada do provedor 2PP.');
  if(input.status==='PAID'&&!input.reference)reject(422,'REFERENCE_REQUIRED','Informe a referência de conciliação da simulação.');
  if(input.status==='REJECTED'){
    if(current!.type!=='WITHDRAWAL')reject(409,'INVALID_PAYMENT_TRANSITION','Estorno reservado apenas para saque confirmado como recusado.');
    const owner=await tx.get('SELECT * FROM users WHERE id=?',[String(current!.user_id)]);
    await postLedger(tx,{user:owner!,wallet:current!.wallet as WalletId,amount:Number(current!.amount_cents),key:`${id}:refund`,kind:'WITHDRAWAL_REFUND',description:'Reserva devolvida após recusa confirmada · simulação',reference:id,createdAt:iso(now)});
  }
  await tx.run('UPDATE payments SET status=?,external_reference=?,updated_at=? WHERE id=?',[input.status,input.reference??null,iso(now),id]);
  await tx.run('INSERT INTO payment_events(id,payment_id,event_key,state,description,created_at) VALUES(?,?,?,?,?,?)',
    [uid('payment_event'),id,`${id}:${input.status}`,input.status,input.reference??'Revisão da operação',iso(now)]);
  await audit(tx,admin,'PAYMENT_RECONCILED',id,{previous:String(current!.status),status:input.status,reference:input.reference??null,isDemo:Number(current!.is_demo)===1});
}
