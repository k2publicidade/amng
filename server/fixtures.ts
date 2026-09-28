import type { Executor, Row } from './database.ts';
import { PLANS, seedCatalog } from './catalog.ts';
import { applyBps, audit, DAY, iso, postLedger, uid } from './domain.ts';
import { hashPassword, token } from './security.ts';
import { distributeDemoCommissions } from './affiliate.ts';
import { addMonths, closeDemoCareer, reserveDemoCareerFunding } from './career.ts';

export interface PlanSnapshot {
  plan: typeof PLANS[number]; version: number; currency: 'USD'; termsVersion: string;
  calculation: 'DEMO_SIMPLE_FLOOR' | 'UNAPPROVED'; principalReturn: 'NOT_DEFINED';
  profitSharingBps: number | null; isDemo: boolean;
}

/** Fixtures exist only in a private scope bound to the browser's demo session. */
export async function createDemo(tx: Executor, now = Date.now()): Promise<Row> {
  const id = uid('demo');
  const passwordHash = await hashPassword(token());
  const user: Row = { id, scope:id, name:'Alex Morgan',email:`${id}@demo.invalid`,password_hash:passwordHash,role:'ADMIN',is_demo:1,referral_code:`AMNG-${id.slice(-8).toUpperCase()}`,created_at:iso(now-120*DAY),blocked:0,mfa_secret:null };
  await tx.run('INSERT INTO users(id,scope,name,email,password_hash,role,is_demo,referral_code,created_at) VALUES(?,?,?,?,?,?,?,?,?)',
    [id,id,String(user.name),String(user.email),passwordHash,'ADMIN',1,String(user.referral_code),String(user.created_at)]);
  await seedCatalog(tx,id);
  const openingId=uid('payment');
  await tx.run('INSERT INTO payments(id,scope,user_id,type,amount_cents,net_cents,wallet,status,provider,created_at,updated_at,is_demo,request_key) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',[openingId,id,id,'DEPOSIT',520000,520000,'deposit','CONFIRMED','DEMO_SIMULATOR',iso(now-110*DAY),iso(now-110*DAY),1,`${id}:opening`]);
  await postLedger(tx,{user,wallet:'deposit',amount:520000,key:`${id}:demo:opening`,kind:'DEMO_DEPOSIT',description:'Crédito de demonstração · sem valor financeiro real',reference:openingId,createdAt:iso(now-110*DAY)});
  for (const planId of ['sc','alph','btc']) {
    const plan = PLANS.find(p => p.id === planId)!;
    const contractId = uid('miner');
    const age=planId==='sc'?9:planId==='alph'?18:100;
    const nominalOffset=planId==='sc'?2:planId==='alph'?3:8;
    const utcDayElapsed=now-new Date(iso(now).slice(0,10)+'T00:00:00.000Z').getTime();
    const offsetMs=Math.min(nominalOffset*60*60*1000,Math.floor(utcDayElapsed/2));
    const started = now-age*DAY-offsetMs;
    const snapshot: PlanSnapshot = { plan,version:1,currency:'USD',termsVersion:'DEMO-2026-09',calculation:'DEMO_SIMPLE_FLOOR',principalReturn:'NOT_DEFINED',profitSharingBps:100,isDemo:true };
    await tx.run(`INSERT INTO contracts(id,scope,user_id,plan_id,principal_cents,snapshot,status,started_at,expires_at,purchased_key,is_demo) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
      [contractId,id,id,plan.id,plan.priceCents,JSON.stringify(snapshot),'ACTIVE',iso(started),iso(started+130*DAY),`${contractId}:fixture`,1]);
    await postLedger(tx,{user,wallet:'deposit',amount:-plan.priceCents,key:`${contractId}:purchase`,kind:'CLOUD_PURCHASE',description:`${plan.name} · contrato de demonstração`,reference:contractId,createdAt:iso(started)});
    const contract=await tx.get('SELECT * FROM contracts WHERE id=?',[contractId]);
    await reserveDemoCareerFunding(tx,user,contract!,started);
    let cycle=0;
    for (let day = 1; day <= age; day++) {
      if(day!==age&&(day%5===0||(planId==='btc'&&day%7===0)))continue;
      cycle++;
      const end = started + day * DAY;
      const earning = applyBps(plan.priceCents,plan.rateBps);
      await tx.run('INSERT INTO mining_cycles(id,contract_id,cycle_number,starts_at,ends_at,settled_at,earned_cents) VALUES(?,?,?,?,?,?,?)',
        [uid('cycle'),contractId,cycle,iso(end-DAY),iso(end),iso(end),earning]);
      if (earning) await postLedger(tx,{user,wallet:'earnings',amount:earning,key:`${contractId}:mining:${cycle}`,kind:'MINING_INCOME',description:`${plan.coin} · ciclo ${cycle} simulado`,reference:contractId,createdAt:iso(end)});
    }
    for (let day=1;day<=age;day++) {
      const earning=applyBps(plan.priceCents,100);
      await postLedger(tx,{user,wallet:'earnings',amount:earning,key:`${contractId}:sharing:${day}`,kind:'PROFIT_SHARING',description:`${plan.name} · participação simulada`,reference:contractId,createdAt:iso(started+day*DAY)});
    }
    if (planId !== 'sc') {
      await tx.run('INSERT INTO mining_cycles(id,contract_id,cycle_number,starts_at,ends_at) VALUES(?,?,?,?,?)',
        [uid('cycle'),contractId,cycle+1,iso(now-offsetMs),iso(now+DAY-offsetMs)]);
    }
  }
  const marketId=uid('position');
  await postLedger(tx,{user,wallet:'deposit',amount:-45000,key:`${marketId}:entry`,kind:'MARKET_ENTRY',description:'Hashrate Market · alocação de demonstração',reference:marketId,createdAt:iso(now-5*DAY)});
  await tx.run('INSERT INTO market_positions(id,scope,user_id,principal_cents,status,created_at,snapshot,is_demo) VALUES(?,?,?,?,?,?,?,?)',
    [marketId,id,id,45000,'ACTIVE',iso(now-5*DAY),JSON.stringify({rateBps:40,calculation:'DEMO_SIMPLE_FLOOR',currency:'USD',isDemo:true}),1]);
  for(let period=1;period<=5;period++) await tx.run('INSERT INTO market_accruals(id,position_id,period,amount_cents,created_at) VALUES(?,?,?,?,?)',[uid('accrual'),marketId,period,180,iso(now-(5-period)*DAY)]);
  // Fictional members and weighted contracts, never mixed with registered accounts.
  const members = [
    ['Sofia Bennett','alph',-1],['Ethan Brooks','doge',-1],['Maya Chen','btc',-1],
    ['Lucas Reed','kda',0],['Olivia Hart','ckb',0],['Daniel Kim','doge',0],
    ['Emma Stone','alph',1],['Noah Rivera','kda',1],['Ava Cooper','etc',1],
    ['Leo Martinez','sc',2],['Grace Park','ckb',2],['Liam Foster','alph',2],
  ] as const;
  const memberIds: string[]=[];
  for(let index=0;index<members.length;index++) {
    const [name,planId,parent]=members[index]; const childId=uid('demo_member'); memberIds.push(childId);
    await tx.run('INSERT INTO users(id,scope,name,email,password_hash,role,is_demo,referral_code,sponsor_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
      [childId,id,name,`${childId}@demo.invalid`,passwordHash,'MEMBER',1,`D-${childId.slice(-8)}`,parent===-1?id:memberIds[parent],iso(now-(100-index)*DAY)]);
    const plan=PLANS.find(p=>p.id===planId)!; const contractId=uid('miner');
    const snapshot:PlanSnapshot={plan,version:1,currency:'USD',termsVersion:'DEMO-2026-09',calculation:'DEMO_SIMPLE_FLOOR',principalReturn:'NOT_DEFINED',profitSharingBps:null,isDemo:true};
    await tx.run('INSERT INTO contracts(id,scope,user_id,plan_id,principal_cents,snapshot,status,started_at,expires_at,purchased_key,is_demo) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
      [contractId,id,childId,plan.id,plan.priceCents,JSON.stringify(snapshot),'ACTIVE',iso(now-80*DAY),iso(now+50*DAY),`${contractId}:fixture`,1]);
    const child=await tx.get('SELECT * FROM users WHERE id=?',[childId]);
    const contract=await tx.get('SELECT * FROM contracts WHERE id=?',[contractId]);
    await postLedger(tx,{user:child!,wallet:'deposit',amount:plan.priceCents,key:`${childId}:fixture:funding`,kind:'DEMO_DEPOSIT',description:'Saldo de fixture isolada de rede',reference:contractId,createdAt:iso(now-81*DAY)});
    await postLedger(tx,{user:child!,wallet:'deposit',amount:-plan.priceCents,key:`${contractId}:purchase`,kind:'CLOUD_PURCHASE',description:'Contrato simulado de membro da rede',reference:contractId,createdAt:iso(now-80*DAY)});
    await distributeDemoCommissions(tx,child!,contract!,now-80*DAY);
    await reserveDemoCareerFunding(tx,child!,contract!,now-80*DAY);
    let cycle=0;
    for(let day=1;day<=80;day++){
      if((day+index)%5===0)continue;
      cycle++;const end=now-(80-day)*DAY;const earned=applyBps(plan.priceCents,plan.rateBps);
      await tx.run('INSERT INTO mining_cycles(id,contract_id,cycle_number,starts_at,ends_at,settled_at,earned_cents) VALUES(?,?,?,?,?,?,?)',[uid('cycle'),contractId,cycle,iso(end-DAY),iso(end),iso(end),earned]);
      if(earned)await postLedger(tx,{user:child!,wallet:'earnings',amount:earned,key:`${contractId}:mining:${cycle}`,kind:'MINING_INCOME',description:'Ciclo histórico de rede · simulação',reference:contractId,createdAt:iso(end)});
    }
  }
  const currentMonth=iso(now).slice(0,7);
  for(let ago=3;ago>=1;ago--)await closeDemoCareer(tx,user,addMonths(currentMonth,-ago),now);
  await tx.run('INSERT INTO support_tickets(id,scope,user_id,subject,message,status,created_at,reply,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',
    [uid('ticket'),id,id,'Sobre os ciclos de ativação','Como funciona o acionamento da máquina a cada 24 horas?','ANSWERED',iso(now-2*DAY),'Na demonstração, o servidor abre um ciclo de 24 horas. A produção é simulada, separada de telemetria real e confirmada no encerramento.',iso(now-DAY)]);
  await tx.run('INSERT INTO coupons(id,scope,code,discount_bps,max_uses,expires_at) VALUES(?,?,?,?,?,?)',
    [uid('coupon'),id,'AMNGDEMO',500,100,iso(now+30*DAY)]);
  await audit(tx,user,'DEMO_CREATED',id,{isolated:true,financialValue:false});
  return user;
}
