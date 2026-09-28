import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANS, CYCLES } from '../server/catalog.ts';
import { applyBps, balance, DAY, DomainError, iso, postLedger } from '../server/domain.ts';
import { activate, closeMarket, convert, deposit, openMarket, processDemo, purchase, reconcilePayment, withdrawal } from '../server/finance.ts';
import { bootstrap } from '../server/queries.ts';
import { database, demoUser, fund } from './helpers.ts';

test('catalog preserves all seven documented prices, rates, weights and unknown cycle rates',()=>{
  assert.deepEqual(PLANS.map(p=>[p.id,p.priceCents,p.rateBps,p.powerWeight,p.durationDays]),[['sc',2500,70,1,130],['etc',8000,74,2,130],['ckb',16000,77,4,130],['kda',35000,82,7,130],['alph',60000,86,11,130],['doge',140000,89,20,130],['btc',300000,92,36,130]]);
  assert.ok(CYCLES.every(c=>c.rateBps===null&&c.status==='PENDING'));
});
test('integer basis-point arithmetic preserves exact boundaries and rejects fractions',()=>{
  assert.equal(applyBps(2500,70),17);assert.equal(applyBps(60000,86),516);assert.equal(applyBps(300000,92),2760);assert.equal(applyBps(1,1),0);
  assert.throws(()=>applyBps(25.01,70),DomainError);assert.throws(()=>applyBps(2500,1.5),DomainError);
});
test('a repeated purchase key creates one contract, one debit and one set of career reserves',async t=>{
  const db=await database();t.after(()=>db.close());
  const user=await db.transaction(tx=>demoUser(tx));await db.transaction(tx=>fund(tx,user,10000));
  const input={planId:'sc',idempotencyKey:'purchase-stable-0001'};
  const first=await db.transaction(tx=>purchase(tx,user,input));const second=await db.transaction(tx=>purchase(tx,user,input));
  assert.equal(first,second);assert.equal(await balance(db,String(user.id),'deposit'),7500);
  assert.equal((await db.get('SELECT COUNT(*) AS count FROM contracts WHERE user_id=?',[String(user.id)]))?.count,1);
  assert.equal((await db.get('SELECT COUNT(*) AS count FROM career_funding WHERE contract_id=?',[first]))?.count,15);
  await assert.rejects(db.transaction(tx=>purchase(tx,user,{...input,planId:'etc'})),(error:unknown)=>error instanceof DomainError&&error.code==='IDEMPOTENCY_CONFLICT');
});
test('concurrent purchases cannot spend the same funds twice',async t=>{
  const db=await database();t.after(()=>db.close());const user=await db.transaction(tx=>demoUser(tx));await db.transaction(tx=>fund(tx,user,8000));
  const results=await Promise.allSettled([db.transaction(tx=>purchase(tx,user,{planId:'etc',idempotencyKey:'race-purchase-one'})),db.transaction(tx=>purchase(tx,user,{planId:'etc',idempotencyKey:'race-purchase-two'}))]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(await balance(db,String(user.id),'deposit'),0);
  assert.equal((await db.get('SELECT COUNT(*) AS count FROM contracts WHERE user_id=?',[String(user.id)]))?.count,1);
});
test('rollback preserves balances and the append-only ledger rejects editing and deleting entries',async t=>{
  const db=await database();t.after(()=>db.close());const user=await db.transaction(tx=>demoUser(tx));await db.transaction(tx=>fund(tx,user,5000));
  await assert.rejects(db.transaction(async tx=>{await postLedger(tx,{user,wallet:'deposit',amount:-2500,key:'abort:debit',kind:'TEST',description:'rollback',reference:'abort'});throw new Error('forced transactional failure');}));
  assert.equal(await balance(db,String(user.id),'deposit'),5000);assert.equal(await db.get('SELECT id FROM ledger_entries WHERE business_key=?',['abort:debit']),undefined);
  await assert.rejects(db.run('UPDATE ledger_entries SET amount_cents=1 WHERE user_id=?',[String(user.id)]));await assert.rejects(db.run('DELETE FROM ledger_entries WHERE user_id=?',[String(user.id)]));
});
test('catalog changes preserve historical contract snapshot and duplicate activation/catchup is harmless',async t=>{
  const db=await database();t.after(()=>db.close());const user=await db.transaction(tx=>demoUser(tx));await db.transaction(tx=>fund(tx,user,5000));
  const now=Date.UTC(2026,8,1);const id=await db.transaction(tx=>purchase(tx,user,{planId:'sc',idempotencyKey:'snapshot-purchase'},now));
  await db.run('UPDATE plans SET rate_bps=1000,price_cents=9999,version=2 WHERE scope=? AND id=?',[String(user.scope),'sc']);
  const a=await db.transaction(tx=>activate(tx,user,id,now));const b=await db.transaction(tx=>activate(tx,user,id,now));assert.equal(a,b);
  await db.transaction(tx=>processDemo(tx,user,now+DAY));const once=await balance(db,String(user.id),'earnings');await db.transaction(tx=>processDemo(tx,user,now+DAY));assert.equal(await balance(db,String(user.id),'earnings'),once);
  const mining=await db.get("SELECT amount_cents FROM ledger_entries WHERE reference=? AND kind='MINING_INCOME'",[id]);assert.equal(mining?.amount_cents,17);
  await assert.rejects(db.run('UPDATE contracts SET snapshot=? WHERE id=?',['{}',id]));
});
test('withdrawals reserve immediately, uncertainty preserves reservation, and rejection refunds once',async t=>{
  const db=await database();t.after(()=>db.close());const user=await db.transaction(tx=>demoUser(tx));
  await db.transaction(tx=>postLedger(tx,{user,wallet:'earnings',amount:10000,key:'earnings:seed',kind:'TEST',description:'test',reference:'TEST'}));
  const id=await db.transaction(tx=>withdrawal(tx,user,{wallet:'earnings',amountCents:4000,idempotencyKey:'withdrawal-stable'}));
  let data=await bootstrap(db,user,'csrf');assert.equal(data.wallets[1].availableCents,6000);assert.equal(data.wallets[1].reservedCents,4000);
  await db.transaction(tx=>reconcilePayment(tx,user,id,{status:'REVIEW_REQUIRED'}));data=await bootstrap(db,user,'csrf');assert.equal(data.wallets[1].reservedCents,4000);
  await db.transaction(tx=>reconcilePayment(tx,user,id,{status:'REJECTED',reference:'DEMO-REJECTED'}));await db.transaction(tx=>reconcilePayment(tx,user,id,{status:'REJECTED',reference:'DEMO-REJECTED'}));
  data=await bootstrap(db,user,'csrf');assert.equal(data.wallets[1].availableCents,10000);assert.equal(data.wallets[1].reservedCents,0);
  assert.equal((await db.get("SELECT COUNT(*) AS count FROM ledger_entries WHERE reference=? AND kind='WITHDRAWAL_REFUND'",[id]))?.count,1);
  await assert.rejects(db.transaction(tx=>reconcilePayment(tx,user,id,{status:'PAID',reference:'DEMO-INVALID'})));
});
test('wallet conversion conserves available funds and market principal/earnings are released once',async t=>{
  const db=await database();t.after(()=>db.close());const user=await db.transaction(tx=>demoUser(tx));
  await db.transaction(tx=>postLedger(tx,{user,wallet:'earnings',amount:10000,key:'conversion:seed',kind:'TEST',description:'test',reference:'TEST'}));
  await db.transaction(tx=>convert(tx,user,{from:'earnings',amountCents:5000,idempotencyKey:'conversion-stable'}));assert.equal(await balance(db,String(user.id),'deposit'),5000);assert.equal(await balance(db,String(user.id),'earnings'),5000);
  const now=Date.UTC(2026,8,1);const id=await db.transaction(tx=>openMarket(tx,user,{amountCents:5000,idempotencyKey:'market-entry-key'},now));
  await db.transaction(tx=>closeMarket(tx,user,id,'market-withdraw-key',now+2*DAY));await db.transaction(tx=>closeMarket(tx,user,id,'market-withdraw-key',now+2*DAY));
  assert.equal(await balance(db,String(user.id),'deposit'),5000);assert.equal(await balance(db,String(user.id),'earnings'),5040);
  const journals=await db.all('SELECT journal_id,SUM(amount_cents) AS total FROM accounting_lines GROUP BY journal_id');assert.ok(journals.every(j=>j.total===0));
});
test('deposit callback-free simulator requires no remote payment and remains idempotent',async t=>{
  const db=await database();t.after(()=>db.close());const user=await db.transaction(tx=>demoUser(tx));const input={amountCents:2500,idempotencyKey:'deposit-stable-key'};
  const first=await db.transaction(tx=>deposit(tx,user,input));const second=await db.transaction(tx=>deposit(tx,user,input));assert.equal(first,second);assert.equal(await balance(db,String(user.id),'deposit'),2500);
  assert.equal((await db.get('SELECT provider FROM payments WHERE id=?',[first]))?.provider,'DEMO_SIMULATOR');
});
