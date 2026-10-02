import test from 'node:test';
import assert from 'node:assert/strict';
import { balance, DAY, DomainError, iso } from '../server/domain.ts';
import { activate, pauseCycle, processDemo, resumeCycle } from '../server/finance.ts';
import { bootstrap } from '../server/queries.ts';
import { contract, database, demoUser } from './helpers.ts';

const HOUR = 3_600_000;

test('pausing a confirmed cycle turns the machine off, freezes the countdown and blocks the credit',async t=>{
  const db=await database();t.after(()=>db.close());
  const user=await db.transaction(tx=>demoUser(tx));
  const start=Date.UTC(2026,0,1);
  const item=await db.transaction(tx=>contract(tx,user,'sc',start,start+130*DAY));
  const cycleId=await db.transaction(tx=>activate(tx,user,String(item.id),start));
  const pausedAt=start+6*HOUR;
  assert.equal(await db.transaction(tx=>pauseCycle(tx,user,String(item.id),pausedAt)),cycleId);
  const paused=await db.get('SELECT * FROM mining_cycles WHERE id=?',[cycleId]);
  assert.equal(String(paused?.paused_at),iso(pausedAt));
  // The confirmed cycle keeps its end; only the clock interpretation freezes.
  assert.equal(String(paused?.ends_at),iso(start+DAY));
  // A machine that is off cannot produce, even after the original end passed.
  await db.transaction(tx=>processDemo(tx,user,start+2*DAY));
  assert.equal(await balance(db,String(user.id),'earnings'),0);
  assert.equal((await db.get('SELECT settled_at FROM mining_cycles WHERE id=?',[cycleId]))?.settled_at,null);
  // The paused cycle is reported as paused, with the frozen cycle preserved.
  const data=await bootstrap(db,(await db.get('SELECT * FROM users WHERE id=?',[String(user.id)]))!,'test-csrf',pausedAt+1000);
  const dto=data.miners.find(miner=>miner.id===String(item.id));
  assert.equal(dto?.status,'PAUSED');
  assert.equal(dto?.pausedAt,iso(pausedAt));
  assert.equal(dto?.cycleEndsAt,iso(start+DAY));
  assert.equal(dto?.cycleCount,0);
});

test('resuming returns the paused interval to the cycle and credits it exactly once at the new end',async t=>{
  const db=await database();t.after(()=>db.close());
  const user=await db.transaction(tx=>demoUser(tx));
  const start=Date.UTC(2026,0,1);
  const item=await db.transaction(tx=>contract(tx,user,'sc',start,start+130*DAY));
  const cycleId=await db.transaction(tx=>activate(tx,user,String(item.id),start));
  const pausedAt=start+6*HOUR;const resumedAt=pausedAt+3*HOUR;
  await db.transaction(tx=>pauseCycle(tx,user,String(item.id),pausedAt));
  assert.equal(await db.transaction(tx=>resumeCycle(tx,user,String(item.id),resumedAt)),cycleId);
  const resumed=await db.get('SELECT * FROM mining_cycles WHERE id=?',[cycleId]);
  assert.equal(resumed?.paused_at,null);
  assert.equal(String(resumed?.ends_at),iso(start+DAY+3*HOUR));
  await db.transaction(tx=>processDemo(tx,user,start+DAY+2*HOUR));
  assert.equal(await balance(db,String(user.id),'earnings'),0);
  await db.transaction(tx=>processDemo(tx,user,start+DAY+3*HOUR));
  assert.equal(await balance(db,String(user.id),'earnings'),17);
  await db.transaction(tx=>processDemo(tx,user,start+5*DAY));
  assert.equal(await balance(db,String(user.id),'earnings'),17);
  assert.equal(await db.get('SELECT COUNT(*) AS count FROM mining_cycles WHERE contract_id=?',[String(item.id)]).then(row=>row?.count),1);
});

test('a paused machine refuses activation and repeated pause commands keep the first pause instant',async t=>{
  const db=await database();t.after(()=>db.close());
  const user=await db.transaction(tx=>demoUser(tx));
  const start=Date.UTC(2026,0,1);
  const item=await db.transaction(tx=>contract(tx,user,'sc',start,start+130*DAY));
  const cycleId=await db.transaction(tx=>activate(tx,user,String(item.id),start));
  const pausedAt=start+HOUR;
  await db.transaction(tx=>pauseCycle(tx,user,String(item.id),pausedAt));
  await assert.rejects(db.transaction(tx=>activate(tx,user,String(item.id),pausedAt+HOUR)),
    (error:unknown)=>error instanceof DomainError&&error.code==='CYCLE_PAUSED');
  assert.equal(await db.transaction(tx=>pauseCycle(tx,user,String(item.id),pausedAt+2*HOUR)),cycleId);
  assert.equal((await db.get('SELECT paused_at FROM mining_cycles WHERE id=?',[cycleId]))?.paused_at,iso(pausedAt));
  assert.equal((await db.get('SELECT COUNT(*) AS count FROM mining_cycles WHERE contract_id=?',[String(item.id)]))?.count,1);
});

test('resuming without a paused cycle is refused',async t=>{
  const db=await database();t.after(()=>db.close());
  const user=await db.transaction(tx=>demoUser(tx));
  const start=Date.UTC(2026,0,1);
  const item=await db.transaction(tx=>contract(tx,user,'sc',start,start+130*DAY));
  await db.transaction(tx=>activate(tx,user,String(item.id),start));
  await assert.rejects(db.transaction(tx=>resumeCycle(tx,user,String(item.id),start+HOUR)),
    (error:unknown)=>error instanceof DomainError&&error.code==='CYCLE_NOT_PAUSED');
});

test('the frozen interval never extends past the contract window',async t=>{
  const db=await database();t.after(()=>db.close());
  const user=await db.transaction(tx=>demoUser(tx));
  const start=Date.UTC(2026,0,1);
  const item=await db.transaction(tx=>contract(tx,user,'sc',start,start+2*DAY));
  const cycleId=await db.transaction(tx=>activate(tx,user,String(item.id),start));
  await db.transaction(tx=>pauseCycle(tx,user,String(item.id),start+2*HOUR));
  await assert.rejects(db.transaction(tx=>resumeCycle(tx,user,String(item.id),start+DAY+3*HOUR)),
    (error:unknown)=>error instanceof DomainError&&error.code==='CONTRACT_WINDOW_EXCEEDED');
  const stillPaused=await db.get('SELECT * FROM mining_cycles WHERE id=?',[cycleId]);
  assert.equal(String(stillPaused?.paused_at),iso(start+2*HOUR));
  assert.equal(await balance(db,String(user.id),'earnings'),0);
});

test('pausing without a confirmed cycle is refused and leaves no cycle behind',async t=>{
  const db=await database();t.after(()=>db.close());
  const user=await db.transaction(tx=>demoUser(tx));
  const start=Date.UTC(2026,0,1);
  const item=await db.transaction(tx=>contract(tx,user,'sc',start,start+130*DAY));
  await assert.rejects(db.transaction(tx=>pauseCycle(tx,user,String(item.id),start+HOUR)),
    (error:unknown)=>error instanceof DomainError&&error.code==='CYCLE_NOT_ACTIVE');
  assert.equal((await db.get('SELECT COUNT(*) AS count FROM mining_cycles WHERE contract_id=?',[String(item.id)]))?.count,0);
});
