import type { Config } from '../server/config.ts';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { postgresDatabase, sqliteDatabase } from '../server/database.ts';
import type { Database, Executor, Row } from '../server/database.ts';
import { migrate } from '../server/schema.ts';
import { PLANS, seedCatalog } from '../server/catalog.ts';
import { DAY, iso, postLedger, uid } from '../server/domain.ts';
import type { PlanSnapshot } from '../server/fixtures.ts';

export const TEST_CONFIG:Config={production:false,port:0,host:'127.0.0.1',origin:'http://localhost:5173',sqlitePath:':memory:',demoEnabled:true,sessionSecret:'exclusive-test-session-key-0123456789abcdef',smtpPort:587,binanceEnabled:false,binanceApiUrl:'https://api.binance.com',binanceStreamUrl:'wss://stream.binance.com:9443'};
/** Each PostgreSQL test owns a new schema in the disposable local test database. */
async function postgresTestDatabase(connectionString:string):Promise<Database>{
  const url=new URL(connectionString);
  if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.pathname!=='/amng_test')throw new Error('PostgreSQL tests require the disposable local amng_test database');
  const schema=`amng_test_${randomUUID().replaceAll('-','')}`;
  const owner=new pg.Pool({connectionString,max:1});
  await owner.query(`CREATE SCHEMA "${schema}"`);
  url.searchParams.set('options',`-c search_path=${schema}`);
  const db=postgresDatabase(url.toString());
  return {...db,async close(){
    try{await db.close();}
    finally{
      try{await owner.query(`DROP SCHEMA "${schema}" CASCADE`);}
      finally{await owner.end();}
    }
  }};
}
export async function database():Promise<Database>{
  const db=process.env.AMNG_TEST_POSTGRES_URL?await postgresTestDatabase(process.env.AMNG_TEST_POSTGRES_URL):sqliteDatabase(':memory:');
  try{await migrate(db);await db.transaction(tx=>seedCatalog(tx));return db;}
  catch(error){await db.close();throw error;}
}
export async function demoUser(tx:Executor,scope?:string,sponsor?:Row,createdAt=Date.UTC(2025,11,1)):Promise<Row>{
  const id=uid('test_user');const demoScope=scope??id;
  await tx.run('INSERT INTO users(id,scope,name,email,password_hash,role,is_demo,referral_code,sponsor_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',[id,demoScope,'Test Participant',`${id}@demo.invalid`,'disabled','MEMBER',1,`TEST-${id}`,sponsor?String(sponsor.id):null,iso(createdAt)]);
  await seedCatalog(tx,demoScope);return (await tx.get('SELECT * FROM users WHERE id=?',[id]))!;
}
export async function contract(tx:Executor,user:Row,planId='sc',starts=Date.UTC(2026,0,1),expires=starts+130*DAY):Promise<Row>{
  const plan=PLANS.find(p=>p.id===planId)!;const id=uid('test_contract');
  const snapshot:PlanSnapshot={plan,version:1,currency:'USD',termsVersion:'DEMO_TEST',calculation:'DEMO_SIMPLE_FLOOR',principalReturn:'NOT_DEFINED',profitSharingBps:null,isDemo:true};
  await tx.run('INSERT INTO contracts(id,scope,user_id,plan_id,principal_cents,snapshot,status,started_at,expires_at,purchased_key,is_demo) VALUES(?,?,?,?,?,?,?,?,?,?,?)',[id,String(user.scope),String(user.id),planId,plan.priceCents,JSON.stringify(snapshot),'ACTIVE',iso(starts),iso(expires),`${id}:purchase`,1]);
  return (await tx.get('SELECT * FROM contracts WHERE id=?',[id]))!;
}
export async function fund(tx:Executor,user:Row,amount:number){await postLedger(tx,{user,wallet:'deposit',amount,key:`${user.id}:opening:${uid('key')}`,kind:'DEMO_DEPOSIT',description:'Test opening',reference:'TEST'});}
export async function cycles(tx:Executor,item:Row,until:number){
  const start=new Date(String(item.started_at)).getTime();const expiry=new Date(String(item.expires_at)).getTime();
  for(let number=1;start+number*DAY<=Math.min(until,expiry);number++)await tx.run('INSERT INTO mining_cycles(id,contract_id,cycle_number,starts_at,ends_at,settled_at,earned_cents) VALUES(?,?,?,?,?,?,?)',[uid('test_cycle'),String(item.id),number,iso(start+(number-1)*DAY),iso(start+number*DAY),iso(start+number*DAY),0]);
}
