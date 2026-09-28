import test from 'node:test';
import assert from 'node:assert/strict';
import { distributeDemoCommissions, reverseDemoCommissions } from '../server/affiliate.ts';
import { careerBudget, closeDemoCareer, measureCareer, reserveDemoCareerFunding } from '../server/career.ts';
import { balance, DAY, iso } from '../server/domain.ts';
import type { Row } from '../server/database.ts';
import { contract, cycles, database, demoUser } from './helpers.ts';

test('first-purchase commission retains N7 pending, recompra handles all seven levels and no compression',async t=>{
  const db=await database();t.after(()=>db.close());let buyer!:Row;let firstContract!:Row;
  await db.transaction(async tx=>{
    let previous=await demoUser(tx);const scope=String(previous.scope);await contract(tx,previous,'sc');
    for(let index=0;index<7;index++){previous=await demoUser(tx,scope,previous);if(index<6)await contract(tx,previous,'sc');}
    buyer=previous;firstContract=await contract(tx,buyer,'sc');
    const results=await distributeDemoCommissions(tx,buyer,firstContract,Date.UTC(2026,0,2));assert.equal(results.length,7);assert.equal(results[6].status,'PENDING_RATE');assert.equal(results[6].amountCents,null);
    const repeat=await distributeDemoCommissions(tx,buyer,firstContract,Date.UTC(2026,0,2));assert.deepEqual(repeat,results);
    assert.equal((await tx.get('SELECT COUNT(*) AS count FROM affiliate_commissions WHERE contract_id=?',[String(firstContract.id)]))?.count,7);
    const second=await contract(tx,buyer,'sc',Date.UTC(2026,0,3));const recurring=await distributeDemoCommissions(tx,buyer,second,Date.UTC(2026,0,3));assert.equal(recurring[6].amountCents,25);assert.equal(recurring[6].status,'CONFIRMED');
  });
});
test('commission reversal appends compensation and never erases the source event',async t=>{
  const db=await database();t.after(()=>db.close());await db.transaction(async tx=>{
    const parent=await demoUser(tx);await contract(tx,parent,'sc');const buyer=await demoUser(tx,String(parent.scope),parent);const item=await contract(tx,buyer,'sc');
    await distributeDemoCommissions(tx,buyer,item,Date.UTC(2026,0,2));assert.equal(await balance(tx,String(parent.id),'affiliate'),200);
    await reverseDemoCommissions(tx,parent,String(item.id),'Demonstration refund');await reverseDemoCommissions(tx,parent,String(item.id),'Demonstration refund');assert.equal(await balance(tx,String(parent.id),'affiliate'),0);
    assert.equal((await tx.get('SELECT COUNT(*) AS count FROM affiliate_commissions WHERE contract_id=?',[String(item.id)]))?.count,1);assert.equal((await tx.get('SELECT COUNT(*) AS count FROM commission_reversals'))?.count,1);
  });
});
test('career funding preserves five-percent cap and all integer cents across five competencies',async t=>{
  const db=await database();t.after(()=>db.close());await db.transaction(async tx=>{
    const user=await demoUser(tx);const item=await contract(tx,user,'sc');const allocation=await reserveDemoCareerFunding(tx,user,item);
    await reserveDemoCareerFunding(tx,user,item);assert.equal(allocation.totalCents,125);assert.equal(allocation.salaryCents,100);assert.equal(allocation.bonusCents,18);assert.equal(allocation.reserveCents,7);
    const rows=await tx.all('SELECT * FROM career_funding WHERE contract_id=?',[String(item.id)]);assert.equal(rows.length,15);assert.equal(rows.reduce((sum,r)=>sum+Number(r.amount_cents),0),125);assert.equal(new Set(rows.map(r=>r.month)).size,5);
    await assert.rejects(tx.run('UPDATE career_funding SET amount_cents=0 WHERE contract_id=?',[String(item.id)]));
  });
});
test('monthly career closes persist evidence, fund payroll, recover periods, and apply 100/50/0 maintenance',async t=>{
  const db=await database();t.after(()=>db.close());let root!:Row;const now=Date.UTC(2026,8,1);
  await db.transaction(async tx=>{
    root=await demoUser(tx);for(const planId of ['sc','btc','btc']){const item=await contract(tx,root,planId);await cycles(tx,item,now);await reserveDemoCareerFunding(tx,root,item);}
    for(const planId of ['kda','kda','alph']){const child=await demoUser(tx,String(root.scope),root);const item=await contract(tx,child,planId);await cycles(tx,item,now);await reserveDemoCareerFunding(tx,child,item);}
    for(const month of ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07'])await closeDemoCareer(tx,root,month,now);
    const march=JSON.parse(String((await tx.get('SELECT snapshot FROM career_periods WHERE user_id=? AND month=?',[String(root.id),'2026-03']))!.snapshot)) as {salaryCents:number;salaryStatus:string;stageIndex:number;powerContracts:unknown[]};
    assert.equal(march.stageIndex,1);assert.equal(march.salaryCents,4000);assert.equal(march.salaryStatus,'PAID');assert.equal(march.powerContracts.length,6);
    const may=JSON.parse(String((await tx.get('SELECT snapshot FROM career_periods WHERE user_id=? AND month=?',[String(root.id),'2026-05']))!.snapshot)) as {maintenanceBps:number};
    const june=JSON.parse(String((await tx.get('SELECT snapshot FROM career_periods WHERE user_id=? AND month=?',[String(root.id),'2026-06']))!.snapshot)) as {maintenanceBps:number};
    const july=JSON.parse(String((await tx.get('SELECT snapshot FROM career_periods WHERE user_id=? AND month=?',[String(root.id),'2026-07']))!.snapshot)) as {maintenanceBps:number;salaryStatus:string};
    assert.equal(may.maintenanceBps,10000);assert.equal(june.maintenanceBps,5000);assert.equal(july.maintenanceBps,0);assert.equal(july.salaryStatus,'SUSPENDED');
    const budget=await careerBudget(tx,String(root.scope),'2026-03','salary');assert.ok(budget.availableCents>=0);
    const before=await balance(tx,String(root.id),'affiliate');await closeDemoCareer(tx,root,'2026-07',now);assert.equal(await balance(tx,String(root.id),'affiliate'),before);
  });
});
test('retention follows contract identity rather than the minimum of old and new power',async t=>{
  const db=await database();t.after(()=>db.close());await db.transaction(async tx=>{
    const root=await demoUser(tx);const old=await contract(tx,root,'btc',Date.UTC(2026,0,1),Date.UTC(2026,1,1));await cycles(tx,old,Date.UTC(2026,1,1));
    await closeDemoCareer(tx,root,'2026-01',Date.UTC(2026,2,1));const replacement=await contract(tx,root,'btc',Date.UTC(2026,1,1),Date.UTC(2026,6,1));await cycles(tx,replacement,Date.UTC(2026,2,1));
    const next=await measureCareer(tx,root,'2026-02');assert.equal(next.power,36);assert.equal(next.previousPower,36);assert.equal(next.retainedPower,0);assert.equal(next.components.find(c=>c.id==='retention')!.score,0);
  });
});
