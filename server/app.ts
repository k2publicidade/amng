import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { BootstrapData } from '../shared/types.ts';
import type { Database, Executor, Row } from './database.ts';
import { postgresDatabase, sqliteDatabase } from './database.ts';
import type { Config } from './config.ts';
import { migrate } from './schema.ts';
import { seedCatalog } from './catalog.ts';
import { audit, DomainError, idempotent, iso, reject, uid } from './domain.ts';
import { constantEqual, encryptSecret, hashPassword, newMfa, sha256, token, verifyMfa, verifyPassword } from './security.ts';
import { createDemo } from './fixtures.ts';
import { adminOverview, bootstrap, minerStatement } from './queries.ts';
import { activate, closeMarket, convert, deposit, openMarket, pauseCycle, processDemo, purchase, reconcilePayment, resumeCycle, withdrawal } from './finance.ts';
import { BinanceQuotes } from './quotes.ts';
import { DatabaseRateLimitStore } from './rate-limit-store.ts';
import { TwoPPProvider } from './providers/two-pp.ts';
import { closeDemoCareer } from './career.ts';
import { careerPreview } from './career-preview.ts';
import { registerCareerEvidenceRoutes } from './career-evidence-routes.ts';
import { registerLedgerRoutes } from './ledger-routes.ts';
import { ADMIN_PERMISSIONS, USER_ROLES, type AdminPermission } from '../shared/permissions.ts';
import { effectiveRole, freshAdministrativeActor, requireAdminAccess, requirePermission } from './authorization.ts';

const COOKIE='amng_session';
const passwordSchema=z.string().min(12,'Use pelo menos 12 caracteres.').max(128);
const amountSchema=z.number().int().min(1).max(100_000_000);
const keySchema=z.string().min(8).max(120).regex(/^[A-Za-z0-9_.:-]+$/);
const totpSchema=z.string().regex(/^\d{6}$/).optional();
interface AuthRequest extends Request { amngSession?:Row;amngUser?:Row; }
interface AppOptions { db?:Database;quotes?:BinanceQuotes;sendReset?:(email:string,url:string)=>Promise<void>;serverless?:boolean; }
export interface AppRuntime { app:express.Express;db:Database;close:()=>Promise<void>; }
const currentUser=(request:Request)=>{
  const user=(request as AuthRequest).amngUser;
  if(!user)reject(401,'AUTH_REQUIRED','Entre na sua conta para continuar.');return user;
};
const currentSession=(request:Request)=>{
  const session=(request as AuthRequest).amngSession;
  if(!session)reject(403,'CSRF_REQUIRED','Recarregue a página antes de continuar.');return session;
};
const administrativeUser=(request:Request,permission?:AdminPermission)=>{
  const user=currentUser(request);
  return permission?requirePermission(user,permission):requireAdminAccess(user);
};
function body<T>(schema:z.ZodType<T>,request:Request):T {
  const parsed=schema.safeParse(request.body??{});
  if(!parsed.success)reject(422,'VALIDATION_ERROR',parsed.error.issues.map(issue=>issue.message).join(' '));return parsed.data;
}
function commandKey(request:Request,provided?:string) {
  const selected=provided??request.header('Idempotency-Key');
  if(!selected)reject(422,'IDEMPOTENCY_KEY_REQUIRED','A operação deve incluir uma chave idempotente para evitar duplicação.');
  return keySchema.parse(selected);
}
function route(handler:(request:Request,response:Response)=>Promise<unknown>){
  return (request:Request,response:Response,next:NextFunction)=>{Promise.resolve(handler(request,response)).catch(next);};
}

export async function createApplication(config:Config,options:AppOptions={}):Promise<AppRuntime> {
  const db=options.db??(config.databaseUrl?postgresDatabase(config.databaseUrl):sqliteDatabase(config.sqlitePath));
  if(config.production&&db.dialect!=='postgres')throw new Error('SQLite cannot be used in production');
  await db.withInitializationLock(async()=>{
    await migrate(db);await db.transaction(tx=>seedCatalog(tx));
    if(config.adminEmail||config.adminPassword){
      if(!config.adminEmail||!config.adminPassword||config.adminPassword.length<12)throw new Error('Both ADMIN_EMAIL and strong ADMIN_PASSWORD are required');
      const email=config.adminEmail.toLowerCase().trim();
      const existing=await db.get('SELECT id FROM users WHERE email=?',[email]);
      if(!existing){
        const hashed=await hashPassword(config.adminPassword);const id=uid('admin');
        await db.transaction(async tx=>{
          await tx.run('INSERT INTO users(id,scope,name,email,password_hash,role,is_demo,referral_code,created_at) VALUES(?,?,?,?,?,?,?,?,?)',[id,'real','AMNG Operations',email,hashed,'ADMIN',0,`AMNG-${id.slice(-8).toUpperCase()}`,iso()]);
          await audit(tx,null,'ADMIN_BOOTSTRAPPED',id,{source:'environment',mfaRequired:true});
        });
      }
    }
  });
  const quotes=options.quotes??new BinanceQuotes(config.binanceEnabled,config.binanceApiUrl,config.binanceStreamUrl);
  const provider=new TwoPPProvider({apiUrl:config.twoPpApiUrl,apiKey:config.twoPpApiKey,webhookSecret:config.twoPpWebhookSecret});
  if(!options.serverless)quotes.start();
  const app=express();app.disable('x-powered-by');
  if(config.production&&(options.serverless||process.env.TRUST_PROXY==='1'))app.set('trust proxy',1);
  app.use(helmet({contentSecurityPolicy:config.production?undefined:false}));
  app.use(cookieParser());
  const limiterStore=(bucket:string)=>options.serverless?new DatabaseRateLimitStore(db,bucket,config.sessionSecret):undefined;
  app.use('/api',rateLimit({windowMs:15*60*1000,limit:600,standardHeaders:'draft-8',legacyHeaders:false,store:limiterStore('api'),message:{error:'Muitas solicitações. Tente novamente em alguns minutos.',code:'RATE_LIMITED'}}));
  // The API contract and signature scheme remain unknown. No webhook is accepted or credited.
  app.post('/api/payments/2pp/webhook',express.raw({type:'application/json',limit:'64kb'}),(_req,res)=>res.status(503).json({error:'O contrato da API 2PP e a validação de assinatura aguardam configuração e homologação.',code:'PROVIDER_CONTRACT_PENDING'}));
  app.use(express.json({limit:'64kb'}));
  app.use('/api',(req,res,next)=>{void (async()=>{
    const raw=typeof req.cookies[COOKIE]==='string'?req.cookies[COOKIE]:undefined;
    if(!raw)return;
    const session=await db.get('SELECT * FROM sessions WHERE token_hash=? AND expires_at>?',[sha256(raw),iso()]);
    if(!session){res.clearCookie(COOKIE,{path:'/',sameSite:'lax',secure:config.production});return;}
    (req as AuthRequest).amngSession=session;
    if(session.user_id){
      const user=await db.get('SELECT * FROM users WHERE id=?',[String(session.user_id)]);
      if(user&&Number(user.blocked)===0)(req as AuthRequest).amngUser=user;
      else{await db.run('DELETE FROM sessions WHERE token_hash=?',[String(session.token_hash)]);(req as AuthRequest).amngSession=undefined;res.clearCookie(COOKIE,{path:'/',sameSite:'lax',secure:config.production});}
    }
  })().then(()=>next(),next);});
  app.use('/api',(req,res,next)=>{
    if(!['POST','PUT','PATCH','DELETE'].includes(req.method))return next();
    try{
      const session=currentSession(req);const supplied=req.header('X-CSRF-Token')??'';
      if(!constantEqual(supplied,String(session.csrf_token)))reject(403,'CSRF_INVALID','Sua sessão foi atualizada. Recarregue a página e tente novamente.');
      const origin=req.header('Origin');
      if(origin&&origin!==config.origin){
        const incoming=new URL(origin);const expected=new URL(config.origin);
        const loopback=['localhost','127.0.0.1'];
        if(config.production||!loopback.includes(incoming.hostname)||!loopback.includes(expected.hostname)||incoming.port!==expected.port)reject(403,'ORIGIN_REJECTED','Origem da solicitação não autorizada.');
      }
      next();
    }catch(error){next(error);}
  });
  const authLimit=rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:'draft-8',legacyHeaders:false,store:limiterStore('auth'),message:{error:'Limite de tentativas atingido. Tente novamente mais tarde.',code:'AUTH_RATE_LIMITED'}});
  app.use(['/api/auth/login','/api/auth/register','/api/auth/reset-request','/api/auth/reset-confirm','/api/auth/demo'],authLimit);
  app.use(['/api/orders','/api/wallets','/api/market/positions'],rateLimit({windowMs:60_000,limit:60,standardHeaders:'draft-8',legacyHeaders:false,store:limiterStore('commands'),message:{error:'Aguarde antes de repetir a operação.',code:'COMMAND_RATE_LIMITED'}}));

  async function establish(req:Request,res:Response,user:Row|null){
    const bearer=token();const csrfToken=token();const lifetime=user?24*60*60*1000:30*60*1000;
    await db.transaction(async tx=>{
      const old=(req as AuthRequest).amngSession;
      if(old)await tx.run('DELETE FROM sessions WHERE token_hash=?',[String(old.token_hash)]);
      await tx.run('INSERT INTO sessions(token_hash,user_id,csrf_token,created_at,expires_at) VALUES(?,?,?,?,?)',[sha256(bearer),user?String(user.id):null,csrfToken,iso(),iso(Date.now()+lifetime)]);
    });
    res.cookie(COOKIE,bearer,{httpOnly:true,sameSite:'lax',secure:config.production,path:'/',maxAge:lifetime});
    (req as AuthRequest).amngSession={token_hash:sha256(bearer),csrf_token:csrfToken};
    if(user)(req as AuthRequest).amngUser=user;else(req as AuthRequest).amngUser=undefined;
    return csrfToken;
  }
  async function replyBootstrap(req:Request,res:Response,userOverride?:Row|null){
    let user=userOverride===undefined?(req as AuthRequest).amngUser??null:userOverride;
    if(user)user=await db.get('SELECT * FROM users WHERE id=?',[String(user.id)])??null;
    if(user&&Number(user.is_demo)===1)await db.transaction(tx=>processDemo(tx,user!));
    const data=await bootstrap(db,user,String(currentSession(req).csrf_token));
    const quoteData=quotes.snapshot();
    data.dashboard={...data.dashboard,...quoteData} as BootstrapData['dashboard'];
    data.integrations=data.integrations.map(integration=>integration.id==='payments'?{...integration,name:'2PP',description:provider.state==='CONTRACT_PENDING'?'Credenciais presentes. Contrato de API, assinatura e homologação ainda pendentes.':'Provedor 2PP selecionado. Configuração de credenciais e contrato de API reservados para a etapa final.'}:integration.id==='quotes'?{...integration,name:'Binance · Spot USDT',status:quoteData.quoteStatus==='CONNECTED'?'CONNECTED':quoteData.quoteStatus==='CONNECTING'?'NOT_CONFIGURED':'ERROR',description:'Cotações públicas em USDT; pares inexistentes ou dados vencidos ficam indisponíveis.',updatedAt:quoteData.quoteUpdatedAt}:integration);
    res.setHeader('Cache-Control','no-store');res.json(data);
  }
  async function sensitive(tx:Executor,req:Request,permissionOrTotp?:AdminPermission|string,totp?:string){
    const isPerm = typeof permissionOrTotp === 'string' && (ADMIN_PERMISSIONS as readonly string[]).includes(permissionOrTotp);
    const permission: AdminPermission = isPerm ? (permissionOrTotp as AdminPermission) : 'admin.access';
    if(permissionOrTotp && !isPerm){totp=permissionOrTotp;}
    const actor=administrativeUser(req,permission);
    const fresh=await freshAdministrativeActor(tx,actor,permission,true);
    if(Number(fresh.is_demo)===1)return fresh;
    if(!fresh.mfa_secret)reject(403,'MFA_REQUIRED','Ative a autenticação de dois fatores antes de alterar a operação.');
    if(!await verifyMfa(tx,fresh,totp,config.sessionSecret))reject(403,'MFA_INVALID','Código de autenticação inválido ou já utilizado.');return fresh;
  }

  app.get('/api/health',route(async(_req,res)=>{await db.get('SELECT 1 AS healthy');res.json({status:'ok'});}));
  app.get('/api/bootstrap',route(async(req,res)=>{if(!(req as AuthRequest).amngSession)await establish(req,res,null);await replyBootstrap(req,res);}));
  app.get('/api/market/quotes',route(async(_req,res)=>{
    if(options.serverless)await quotes.refresh();
    res.setHeader('Cache-Control',options.serverless?'public, s-maxage=15, stale-while-revalidate=30':'no-store');
    res.json(quotes.snapshot());
  }));
  if(!options.serverless)app.get('/api/market/stream',(req,res)=>{
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
    const send=(value:unknown)=>{res.write(`event: quotes\ndata: ${JSON.stringify(value)}\n\n`);};send(quotes.snapshot());
    quotes.on('update',send);const heartbeat=setInterval(()=>{res.write(': keepalive\n\n');send(quotes.snapshot());},15_000);heartbeat.unref();
    req.on('close',()=>{quotes.off('update',send);clearInterval(heartbeat);});
  });

  app.post('/api/auth/demo',route(async(req,res)=>{
    if(!config.demoEnabled)reject(404,'DEMO_DISABLED','A demonstração está indisponível neste ambiente.');
    const existing=(req as AuthRequest).amngUser;
    const user=existing&&Number(existing.is_demo)===1?existing:await db.transaction(tx=>createDemo(tx));
    await establish(req,res,user);await replyBootstrap(req,res,user);
  }));
  app.post('/api/auth/register',route(async(req,res)=>{
    const input=body(z.object({name:z.string().trim().min(2).max(80),email:z.email().max(180),password:passwordSchema,referralCode:z.string().trim().max(80).optional(),termsAccepted:z.literal(true)}).strict(),req);
    const email=input.email.toLowerCase().trim();const hashed=await hashPassword(input.password);const id=uid('member');
    const user=await db.transaction(async tx=>{
      if(await tx.get('SELECT id FROM users WHERE email=?',[email]))reject(409,'REGISTRATION_UNAVAILABLE','Não foi possível cadastrar com os dados informados.');
      let sponsor:Row|undefined;
      if(input.referralCode){sponsor=await tx.get('SELECT id FROM users WHERE referral_code=? AND is_demo=0 AND blocked=0',[input.referralCode]);if(!sponsor)reject(422,'REFERRAL_INVALID','Código de indicação não disponível para uma conta real.');}
      await tx.run('INSERT INTO users(id,scope,name,email,password_hash,role,is_demo,referral_code,sponsor_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
        [id,'real',input.name,email,hashed,'MEMBER',0,`AMNG-${id.slice(-8).toUpperCase()}`,sponsor?String(sponsor.id):null,iso()]);
      const created=await tx.get('SELECT * FROM users WHERE id=?',[id]);await audit(tx,created!,'ACCOUNT_REGISTERED',id,{termsAccepted:true,termsVersion:'PLATFORM-PREVIEW-v1'});return created!;
    });
    await establish(req,res,user);res.status(201);await replyBootstrap(req,res,user);
  }));
  app.post('/api/auth/login',route(async(req,res)=>{
    const input=body(z.object({email:z.email().max(180),password:z.string().min(1).max(128),totp:totpSchema}).strict(),req);
    const user=await db.get('SELECT * FROM users WHERE email=? AND is_demo=0',[input.email.toLowerCase().trim()]);
    // Always execute a password hash comparison, including unknown email addresses.
    const fallback='scrypt:00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
    const matches=await verifyPassword(input.password,user?String(user.password_hash):fallback);
    if(!user||!matches||Number(user.blocked)===1)reject(401,'INVALID_CREDENTIALS','Email, senha ou autenticação inválidos.');
    if(user.mfa_secret){const valid=await db.transaction(async tx=>{await tx.lockUser(String(user.id));const fresh=await tx.get('SELECT * FROM users WHERE id=?',[String(user.id)]);return verifyMfa(tx,fresh!,input.totp,config.sessionSecret);});if(!valid)reject(401,'INVALID_CREDENTIALS','Email, senha ou autenticação inválidos.');}
    await establish(req,res,user);await replyBootstrap(req,res,user);
  }));
  app.post('/api/auth/logout',route(async(req,res)=>{await establish(req,res,null);await replyBootstrap(req,res,null);}));

  const mailer=config.smtpHost&&config.smtpFrom?nodemailer.createTransport({host:config.smtpHost,port:config.smtpPort,secure:config.smtpPort===465,auth:config.smtpUser?{user:config.smtpUser,pass:config.smtpPassword}:undefined,connectionTimeout:7000,socketTimeout:10000}):null;
  app.post('/api/auth/reset-request',route(async(req,res)=>{
    const input=body(z.object({email:z.email().max(180)}).strict(),req);
    const user=await db.get('SELECT * FROM users WHERE email=? AND is_demo=0 AND blocked=0',[input.email.toLowerCase().trim()]);
    const deliveryConfigured=!!(mailer||options.sendReset);
    if(user&&deliveryConfigured){
      const bearer=token();await db.run('INSERT INTO password_resets(token_hash,user_id,expires_at) VALUES(?,?,?)',[sha256(bearer),String(user.id),iso(Date.now()+30*60*1000)]);
      const url=`${config.origin}/recover?token=${bearer}`;
      try{if(options.sendReset)await options.sendReset(String(user.email),url);else await mailer!.sendMail({from:config.smtpFrom,to:String(user.email),subject:'AMNG · redefinir senha',text:`Para redefinir sua senha, abra este link em até 30 minutos: ${url}\nSe você não solicitou esta alteração, ignore a mensagem.`});}
      catch{await db.run('DELETE FROM password_resets WHERE token_hash=?',[sha256(bearer)]);}
    }
    res.json({message:'Se houver uma conta elegível, as instruções serão enviadas ao email cadastrado.',deliveryConfigured});
  }));
  app.post('/api/auth/reset-confirm',route(async(req,res)=>{
    const input=body(z.object({token:z.string().length(64).regex(/^[a-f0-9]+$/),newPassword:passwordSchema}).strict(),req);const hashed=await hashPassword(input.newPassword);
    await db.transaction(async tx=>{
      const reset=await tx.get('SELECT * FROM password_resets WHERE token_hash=? AND consumed_at IS NULL AND expires_at>?',[sha256(input.token),iso()]);
      if(!reset)reject(409,'RESET_EXPIRED','Link inválido ou expirado. Solicite uma nova recuperação.');
      await tx.lockUser(String(reset.user_id));const fresh=await tx.get('SELECT * FROM password_resets WHERE token_hash=? AND consumed_at IS NULL AND expires_at>?',[sha256(input.token),iso()]);
      if(!fresh)reject(409,'RESET_EXPIRED','Link inválido ou expirado.');
      await tx.run('UPDATE users SET password_hash=? WHERE id=?',[hashed,String(reset.user_id)]);
      await tx.run('UPDATE password_resets SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL',[iso(),String(reset.user_id)]);
      await tx.run('DELETE FROM sessions WHERE user_id=?',[String(reset.user_id)]);
      const actor=await tx.get('SELECT * FROM users WHERE id=?',[String(reset.user_id)]);await audit(tx,actor!,'PASSWORD_RESET',String(reset.user_id),{sessionsRevoked:true,pendingResetsRevoked:true});
    });
    await establish(req,res,null);res.json({message:'Senha redefinida. Entre novamente.',csrfToken:String(currentSession(req).csrf_token)});
  }));
  app.patch('/api/profile',route(async(req,res)=>{
    const user=currentUser(req);const input=body(z.object({name:z.string().trim().min(2).max(80)}).strict(),req);
    await db.transaction(async tx=>{await tx.run('UPDATE users SET name=? WHERE id=?',[input.name,String(user.id)]);await audit(tx,user,'PROFILE_UPDATED',String(user.id),{field:'name'});});await replyBootstrap(req,res);
  }));
  app.post('/api/auth/password',route(async(req,res)=>{
    const user=currentUser(req);const input=body(z.object({currentPassword:z.string().max(128),newPassword:passwordSchema,totp:totpSchema}).strict(),req);
    const hashed=await hashPassword(input.newPassword);
    await db.transaction(async tx=>{
      await tx.lockUser(String(user.id));const fresh=await tx.get('SELECT * FROM users WHERE id=?',[String(user.id)]);
      if(!Number(fresh!.is_demo)&&!await verifyPassword(input.currentPassword,String(fresh!.password_hash)))reject(401,'PASSWORD_INVALID','Senha atual inválida.');
      if(fresh!.mfa_secret&&!await verifyMfa(tx,fresh!,input.totp,config.sessionSecret))reject(403,'MFA_INVALID','Informe um código de autenticação válido.');
      await tx.run('UPDATE users SET password_hash=? WHERE id=?',[hashed,String(user.id)]);
      await tx.run('UPDATE password_resets SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL',[iso(),String(user.id)]);
      await tx.run('DELETE FROM sessions WHERE user_id=?',[String(user.id)]);await audit(tx,user,'PASSWORD_CHANGED',String(user.id),{sessionsRevoked:true,pendingResetsRevoked:true});
    });
    await establish(req,res,user);await replyBootstrap(req,res);
  }));
  app.post('/api/auth/2fa/setup',route(async(req,res)=>{
    const user=currentUser(req);const input=body(z.object({password:z.string().max(128).optional()}).strict(),req);
    if(user.mfa_secret)reject(409,'MFA_ENABLED','A autenticação de dois fatores já está ativa.');
    if(!Number(user.is_demo)&&!await verifyPassword(input.password??'',String(user.password_hash)))reject(401,'PASSWORD_INVALID','Confirme sua senha para configurar a autenticação.');
    const mfa=newMfa(String(user.email));await db.transaction(async tx=>{await tx.run('UPDATE users SET mfa_pending_secret=? WHERE id=?',[encryptSecret(mfa.secret,config.sessionSecret),String(user.id)]);await audit(tx,user,'MFA_SETUP_STARTED',String(user.id),{});});res.json(mfa);
  }));
  app.post('/api/auth/2fa/confirm',route(async(req,res)=>{
    const user=currentUser(req);const input=body(z.object({totp:z.string().regex(/^\d{6}$/)}).strict(),req);
    await db.transaction(async tx=>{await tx.lockUser(String(user.id));const fresh=await tx.get('SELECT * FROM users WHERE id=?',[String(user.id)]);if(!await verifyMfa(tx,fresh!,input.totp,config.sessionSecret,Date.now(),true))reject(403,'MFA_INVALID','Código inválido. Verifique o aplicativo autenticador.');await tx.run('UPDATE users SET mfa_secret=mfa_pending_secret,mfa_pending_secret=NULL WHERE id=?',[String(user.id)]);await tx.run('DELETE FROM sessions WHERE user_id=? AND token_hash<>?',[String(user.id),String(currentSession(req).token_hash)]);await audit(tx,user,'MFA_ENABLED',String(user.id),{});});await replyBootstrap(req,res);
  }));
  app.post('/api/auth/2fa/disable',route(async(req,res)=>{
    const user=currentUser(req);const input=body(z.object({password:z.string().max(128).optional(),totp:z.string().regex(/^\d{6}$/)}).strict(),req);
    if(!Number(user.is_demo)&&!await verifyPassword(input.password??'',String(user.password_hash)))reject(401,'PASSWORD_INVALID','Senha inválida.');
    await db.transaction(async tx=>{await tx.lockUser(String(user.id));const fresh=await tx.get('SELECT * FROM users WHERE id=?',[String(user.id)]);if(!await verifyMfa(tx,fresh!,input.totp,config.sessionSecret))reject(403,'MFA_INVALID','Código inválido ou já utilizado.');await tx.run('UPDATE users SET mfa_secret=NULL,mfa_pending_secret=NULL,last_totp_step=NULL WHERE id=?',[String(user.id)]);await tx.run('DELETE FROM sessions WHERE user_id=? AND token_hash<>?',[String(user.id),String(currentSession(req).token_hash)]);await audit(tx,user,'MFA_DISABLED',String(user.id),{});});await replyBootstrap(req,res);
  }));

  app.post('/api/orders',route(async(req,res)=>{const user=currentUser(req);const input=body(z.object({planId:z.string().min(1).max(40),couponCode:z.string().trim().max(40).optional(),idempotencyKey:keySchema}).strict(),req);await db.transaction(tx=>purchase(tx,user,input));res.status(201);await replyBootstrap(req,res);}));
  app.post('/api/miners/:id/activate',route(async(req,res)=>{
    const user=currentUser(req);
    const input=body(z.object({idempotencyKey:keySchema}).strict(),req);
    const contractId=String(req.params.id);
    const cycleId=await db.transaction(tx=>idempotent(tx,user,'activation',input.idempotencyKey,{contractId},()=>activate(tx,user,contractId)));
    const receipt=await db.get('SELECT ends_at FROM mining_cycles WHERE id=?',[cycleId]);
    if(!receipt||new Date(String(receipt.ends_at)).getTime()<=Date.now())reject(409,'CYCLE_RECEIPT_EXPIRED','Esta ativação pertence a um ciclo já encerrado. Atualize a máquina antes de iniciar outro ciclo.');
    await replyBootstrap(req,res);
  }));
  app.post('/api/miners/:id/pause',route(async(req,res)=>{
    const user=currentUser(req);
    const input=body(z.object({idempotencyKey:keySchema}).strict(),req);
    const contractId=String(req.params.id);
    await db.transaction(tx=>idempotent(tx,user,'cycle-pause',input.idempotencyKey,{contractId},()=>pauseCycle(tx,user,contractId)));
    const receipt=await db.get('SELECT paused_at,settled_at FROM mining_cycles WHERE contract_id=? ORDER BY cycle_number DESC LIMIT 1',[contractId]);
    if(!receipt||!receipt.paused_at||receipt.settled_at)reject(409,'CYCLE_RECEIPT_EXPIRED','Esta pausa não corresponde ao ciclo vigente. Atualize a máquina antes de continuar.');
    await replyBootstrap(req,res);
  }));
  app.post('/api/miners/:id/resume',route(async(req,res)=>{
    const user=currentUser(req);
    const input=body(z.object({idempotencyKey:keySchema}).strict(),req);
    const contractId=String(req.params.id);
    const cycleId=await db.transaction(tx=>idempotent(tx,user,'cycle-resume',input.idempotencyKey,{contractId},()=>resumeCycle(tx,user,contractId)));
    // The receipt must prove a running cycle; a stale one never triggers the ignition sequence.
    const receipt=await db.get('SELECT ends_at,paused_at,settled_at FROM mining_cycles WHERE id=?',[cycleId]);
    if(!receipt||receipt.paused_at||receipt.settled_at||new Date(String(receipt.ends_at)).getTime()<=Date.now())reject(409,'CYCLE_RECEIPT_EXPIRED','Esta retomada pertence a um ciclo já encerrado. Atualize a máquina antes de religar.');
    await replyBootstrap(req,res);
  }));
  app.get('/api/miners/:id/statement',route(async(req,res)=>{
    const user=currentUser(req);
    const input=z.object({days:z.coerce.number().int().min(1).max(30).default(30),page:z.coerce.number().int().min(1).max(100000).default(1)}).strict().parse(req.query);
    const data=await minerStatement(db,user,String(req.params.id),input.days,input.page);
    res.setHeader('Cache-Control','no-store');res.json(data);
  }));
  app.post('/api/wallets/deposits',route(async(req,res)=>{const user=currentUser(req);const input=body(z.object({amountCents:amountSchema,idempotencyKey:keySchema.optional()}).strict(),req);await db.transaction(tx=>deposit(tx,user,{...input,idempotencyKey:commandKey(req,input.idempotencyKey)}));res.status(201);await replyBootstrap(req,res);}));
  app.post('/api/wallets/withdrawals',route(async(req,res)=>{const user=currentUser(req);const input=body(z.object({wallet:z.enum(['deposit','earnings','affiliate']),amountCents:amountSchema,idempotencyKey:keySchema.optional()}).strict(),req);await db.transaction(tx=>withdrawal(tx,user,{...input,idempotencyKey:commandKey(req,input.idempotencyKey)}));res.status(201);await replyBootstrap(req,res);}));
  app.post('/api/wallets/conversions',route(async(req,res)=>{const user=currentUser(req);const input=body(z.object({from:z.enum(['earnings','affiliate']),amountCents:amountSchema,idempotencyKey:keySchema.optional()}).strict(),req);await db.transaction(tx=>convert(tx,user,{...input,idempotencyKey:commandKey(req,input.idempotencyKey)}));await replyBootstrap(req,res);}));
  app.post('/api/market/positions',route(async(req,res)=>{const user=currentUser(req);const input=body(z.object({amountCents:amountSchema,idempotencyKey:keySchema.optional()}).strict(),req);await db.transaction(tx=>openMarket(tx,user,{...input,idempotencyKey:commandKey(req,input.idempotencyKey)}));res.status(201);await replyBootstrap(req,res);}));
  app.post('/api/market/positions/:id/withdraw',route(async(req,res)=>{const user=currentUser(req);const input=body(z.object({idempotencyKey:keySchema.optional()}).strict(),req);await db.transaction(tx=>closeMarket(tx,user,String(req.params.id),commandKey(req,input.idempotencyKey)));await replyBootstrap(req,res);}));
  app.post('/api/cycles/orders',route(async(req,_res)=>{currentUser(req);reject(409,'CYCLE_RULE_PENDING','A taxa dos planos de ciclo ainda não foi definida. Contratação desativada.');}));
  app.post('/api/support/tickets',route(async(req,res)=>{const user=currentUser(req);const input=body(z.object({subject:z.string().trim().min(3).max(120),message:z.string().trim().min(10).max(5000)}).strict(),req);const id=uid('ticket');await db.transaction(async tx=>{await tx.run('INSERT INTO support_tickets(id,scope,user_id,subject,message,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',[id,String(user.scope),String(user.id),input.subject,input.message,'OPEN',iso(),iso()]);await audit(tx,user,'TICKET_CREATED',id,{subject:input.subject});});res.status(201);await replyBootstrap(req,res);}));

  app.get('/api/admin/overview',route(async(req,res)=>{const user=administrativeUser(req);const data=await adminOverview(db,user);data.integrations=data.integrations.map(i=>i.id==='payments'?{...i,name:'2PP',description:'Configuração final pendente: credenciais, contrato de API, assinaturas e homologação.'}:i.id==='quotes'?{...i,name:'Binance · Spot USDT',status:quotes.snapshot().quoteStatus==='CONNECTED'?'CONNECTED':'ERROR',updatedAt:quotes.snapshot().quoteUpdatedAt}:i);res.setHeader('Cache-Control','no-store');res.json(data);}));
  app.patch('/api/admin/rules/:id',route(async(req,res)=>{
    const input=body(z.object({enabled:z.boolean().optional(),status:z.enum(['CONFIRMED','PENDING','NOT_APPLICABLE']).optional(),description:z.string().trim().min(10).max(2000).optional(),totp:totpSchema}).strict(),req);
    await db.transaction(async tx=>{const user=await sensitive(tx,req,input.totp);const previous=await tx.get('SELECT * FROM product_rules WHERE scope=? AND id=?',[String(user.scope),String(req.params.id)]);if(!previous)reject(404,'RULE_NOT_FOUND','Regra não encontrada.');if(input.enabled&&Number(user.is_demo)!==1)reject(409,'POLICY_APPROVAL_REQUIRED','A liberação financeira requer políticas completas, provedor homologado e aprovação em duas etapas.');const enabled=input.enabled??Number(previous.enabled)===1;const status=input.status??String(previous.status);if(enabled&&status!=='CONFIRMED')reject(409,'RULE_NOT_CONFIRMED','Confirme a regra antes de ativar o interruptor.');await tx.run('UPDATE product_rules SET enabled=?,status=?,description=?,version=version+1 WHERE scope=? AND id=?',[enabled?1:0,status,input.description??String(previous.description),String(user.scope),String(req.params.id)]);await audit(tx,user,'RULE_VERSION_CREATED',String(req.params.id),{previous:{enabled:Number(previous.enabled)===1,status:previous.status,version:previous.version},next:{enabled,status,description:input.description??String(previous.description)},isDemo:Number(user.is_demo)===1});});res.json(await adminOverview(db,administrativeUser(req)));
  }));
  app.patch('/api/admin/plans/:id',route(async(req,res)=>{
    const input=body(z.object({name:z.string().trim().min(3).max(80).optional(),priceCents:amountSchema.optional(),durationDays:z.number().int().min(1).max(3650).optional(),rateBps:z.number().int().min(0).max(10000).optional(),powerWeight:z.number().int().min(1).max(10000).optional(),status:z.enum(['DOCUMENTED','APPROVED','PAUSED']).optional(),totp:totpSchema}).strict(),req);
    await db.transaction(async tx=>{const user=await sensitive(tx,req,input.totp);const previous=await tx.get('SELECT * FROM plans WHERE scope=? AND id=?',[String(user.scope),String(req.params.id)]);if(!previous)reject(404,'PLAN_NOT_FOUND','Plano não encontrado.');if(!Number(user.is_demo)&&(input.status==='APPROVED'||input.rateBps!==undefined||input.priceCents!==undefined||input.durationDays!==undefined||input.powerWeight!==undefined))reject(409,'POLICY_APPROVAL_REQUIRED','Mudanças monetárias reais exigem aprovação e versão de política homologada.');await tx.run('UPDATE plans SET name=?,price_cents=?,duration_days=?,rate_bps=?,power_weight=?,status=?,version=version+1 WHERE scope=? AND id=?',[input.name??String(previous.name),input.priceCents??Number(previous.price_cents),input.durationDays??Number(previous.duration_days),input.rateBps??Number(previous.rate_bps),input.powerWeight??Number(previous.power_weight),input.status??String(previous.status),String(user.scope),String(req.params.id)]);await audit(tx,user,'PLAN_VERSION_CREATED',String(req.params.id),{previous:{priceCents:previous.price_cents,rateBps:previous.rate_bps,powerWeight:previous.power_weight,version:previous.version},next:{...input,totp:undefined},existingContractsUnchanged:true,isDemo:Number(user.is_demo)===1});});res.json(await adminOverview(db,administrativeUser(req)));
  }));
  app.post('/api/admin/coupons',route(async(req,res)=>{
    const input=body(z.object({code:z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/),discountBps:z.number().int().min(1).max(9999),maxUses:z.number().int().min(1).max(100000),expiresAt:z.iso.datetime(),totp:totpSchema}).strict(),req);
    if(new Date(input.expiresAt).getTime()<=Date.now())reject(422,'COUPON_EXPIRED','Defina uma data de expiração futura.');
    await db.transaction(async tx=>{const user=await sensitive(tx,req,input.totp);if(!Number(user.is_demo))reject(409,'POLICY_APPROVAL_REQUIRED','Campanhas monetárias reais aguardam política aprovada.');const id=uid('coupon');await tx.run('INSERT INTO coupons(id,scope,code,discount_bps,max_uses,expires_at) VALUES(?,?,?,?,?,?)',[id,String(user.scope),input.code.toUpperCase(),input.discountBps,input.maxUses,input.expiresAt]);await audit(tx,user,'COUPON_CREATED',id,{code:input.code.toUpperCase(),discountBps:input.discountBps,maxUses:input.maxUses,isDemo:true});});res.status(201).json(await adminOverview(db,administrativeUser(req)));
  }));
  app.patch('/api/admin/tickets/:id',route(async(req,res)=>{
    const input=body(z.object({status:z.enum(['OPEN','ANSWERED','CLOSED']),reply:z.string().trim().max(5000).optional(),totp:totpSchema}).strict(),req);
    if(input.status==='ANSWERED'&&!input.reply)reject(422,'REPLY_REQUIRED','Escreva a resposta para marcar o chamado como respondido.');
    await db.transaction(async tx=>{const user=await sensitive(tx,req,input.totp);const ticket=await tx.get('SELECT id FROM support_tickets WHERE id=? AND scope=?',[String(req.params.id),String(user.scope)]);if(!ticket)reject(404,'TICKET_NOT_FOUND','Chamado não encontrado.');await tx.run('UPDATE support_tickets SET status=?,reply=COALESCE(?,reply),updated_at=? WHERE id=?',[input.status,input.reply??null,iso(),String(ticket.id)]);await audit(tx,user,'TICKET_UPDATED',String(ticket.id),{status:input.status});});res.json(await adminOverview(db,administrativeUser(req)));
  }));
  app.patch('/api/admin/users/:id',route(async(req,res)=>{
    const input=body(z.object({name:z.string().trim().min(2).max(80).optional(),blocked:z.boolean().optional(),role:z.enum(['MEMBER','ADMIN']).optional(),totp:totpSchema}).strict(),req);
    await db.transaction(async tx=>{const user=await sensitive(tx,req,input.totp);const target=await tx.get('SELECT * FROM users WHERE id=? AND scope=?',[String(req.params.id),String(user.scope)]);if(!target)reject(404,'USER_NOT_FOUND','Participante não encontrado.');if(target.id===user.id&&(input.blocked===true||input.role&&input.role!=='ADMIN'))reject(409,'SELF_LOCKOUT','Esta ação removeria seu próprio acesso administrativo.');if(input.role&&input.role!==target.role&&Number(user.is_demo)!==1)reject(409,'ROLE_APPROVAL_REQUIRED','Promoção de administradores reais requer configuração de acesso pelo operador responsável.');await tx.run('UPDATE users SET name=?,blocked=?,role=? WHERE id=?',[input.name??String(target.name),input.blocked===undefined?Number(target.blocked):input.blocked?1:0,input.role??String(target.role),String(target.id)]);if(input.blocked===true&&Number(target.blocked)!==1||input.role!==undefined&&input.role!==target.role)await tx.run('DELETE FROM sessions WHERE user_id=?',[String(target.id)]);await audit(tx,user,'USER_UPDATED',String(target.id),{previous:{role:target.role,blocked:target.blocked},next:{...input,totp:undefined},sponsorUnchanged:true});});res.json(await adminOverview(db,administrativeUser(req)));
  }));
  app.post('/api/admin/profit-sharing',route(async(req,res)=>{
    const input=body(z.object({date:z.iso.date(),rateBps:z.number().int().min(90).max(110),idempotencyKey:keySchema.optional(),totp:totpSchema}).strict(),req);
    if(input.date<iso().slice(0,10))reject(409,'HISTORICAL_RATE_IMMUTABLE','A taxa de períodos anteriores não pode ser reescrita.');
    await db.transaction(async tx=>{const user=await sensitive(tx,req,input.totp);if(!Number(user.is_demo))reject(409,'POLICY_APPROVAL_REQUIRED','Base e funding de Profit Sharing não aprovados para operação real.');await idempotent(tx,user,'profit-sharing-rate',commandKey(req,input.idempotencyKey),{date:input.date,rateBps:input.rateBps},async()=>{const id=uid('sharing_rate');await tx.run('INSERT INTO profit_sharing_rates(id,scope,date,rate_bps,actor_id,source,created_at) VALUES(?,?,?,?,?,?,?)',[id,String(user.scope),input.date,input.rateBps,String(user.id),'DEMO_SANDBOX',iso()]);await audit(tx,user,'DEMO_PROFIT_SHARING_RATE',id,{date:input.date,rateBps:input.rateBps,historicalLedgerUnchanged:true,isDemo:true});return id;});});res.status(201).json(await adminOverview(db,administrativeUser(req)));
  }));
  app.patch('/api/admin/payments/:id',route(async(req,res)=>{
    const input=body(z.object({status:z.enum(['PROCESSING','REVIEW_REQUIRED','PAID','REJECTED']),reference:z.string().trim().min(3).max(160).optional(),totp:totpSchema}).strict(),req);
    await db.transaction(async tx=>{const user=await sensitive(tx,req,input.totp);await reconcilePayment(tx,user,String(req.params.id),input);});res.json(await adminOverview(db,administrativeUser(req)));
  }));
  app.post('/api/admin/process',route(async(req,res)=>{
    const input=body(z.object({totp:totpSchema}).strict(),req);
    const result=await db.transaction(async tx=>{const result={miningCycles:0,profitSharingDays:0,marketDays:0,payments:0};const user=await sensitive(tx,req,input.totp);if(!Number(user.is_demo))reject(409,'PROCESSING_DISABLED','Processamento financeiro real aguarda políticas e integrações homologadas.');for(const member of await tx.all('SELECT * FROM users WHERE scope=? AND blocked=0',[String(user.scope)])){const summary=await processDemo(tx,member);for(const key of Object.keys(result) as (keyof typeof result)[])result[key]+=summary[key];}await audit(tx,user,'DEMO_PERIODS_PROCESSED',String(user.scope),{...result,isDemo:true});return result;});res.json({result,admin:await adminOverview(db,administrativeUser(req))});
  }));
  app.get('/api/admin/career/preview',route(async(req,res)=>{
    const actor=administrativeUser(req);
    const month=z.string().regex(/^\d{4}-\d{2}$/).parse(req.query.month);
    res.json(await db.transaction(tx=>careerPreview(tx,actor,month)));
  }));
  app.post('/api/admin/career/close',route(async(req,res)=>{
    const input=body(z.object({month:z.string().regex(/^\d{4}-\d{2}$/),totp:totpSchema,idempotencyKey:keySchema}).strict(),req);
    const result=await db.transaction(async tx=>{let result:Awaited<ReturnType<typeof closeDemoCareer>>|undefined;const user=await sensitive(tx,req,input.totp);await idempotent(tx,user,'career-close',input.idempotencyKey,{month:input.month},async()=>{result=await closeDemoCareer(tx,user,input.month);return result.id;});if(!result){const stored=await tx.get('SELECT id,snapshot FROM career_closings WHERE scope=? AND month=?',[String(user.scope),input.month]);result={id:String(stored!.id),...JSON.parse(String(stored!.snapshot)) as {users:number;salaryPaidCents:number;bonusPaidCents:number;awaitingFunding:number}};}return result;});
    res.json({result:{...result,month:input.month},admin:await adminOverview(db,administrativeUser(req))});
  }));

  registerCareerEvidenceRoutes(app, db, currentUser);
  registerLedgerRoutes(app, { db, currentUser });
  app.use('/api',(_req,res)=>{res.status(404).json({error:'Endpoint não encontrado.',code:'NOT_FOUND'});});
  const dist=resolve('dist');
  if(existsSync(dist)){app.use(express.static(dist,{maxAge:config.production?'1h':0}));app.get('/{*splat}',(_req,res)=>res.sendFile(resolve(dist,'index.html')));}
  app.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
    if(error instanceof DomainError){res.status(error.status).json({error:error.message,code:error.code});return;}
    if(error instanceof z.ZodError){res.status(422).json({error:'Parâmetros inválidos.',code:'VALIDATION_ERROR'});return;}
    const shaped=error as {code?:string;type?:string;message?:string};
    if(shaped.type==='entity.parse.failed'){res.status(400).json({error:'JSON inválido.',code:'INVALID_JSON'});return;}
    if(shaped.code==='23505'||shaped.code==='SQLITE_CONSTRAINT_UNIQUE'||shaped.message?.includes('UNIQUE constraint failed')){res.status(409).json({error:'Este registro já existe ou a operação já foi utilizada.',code:'DUPLICATE_RECORD'});return;}
    if(['40001','40P01','SQLITE_BUSY'].includes(shaped.code??'')){res.status(409).json({error:'A operação concorreu com outra alteração. Recarregue e repita com a mesma chave.',code:'TRANSACTION_CONFLICT'});return;}
    console.error(JSON.stringify({event:'request_failed',errorType:error instanceof Error?error.name:'unknown'}));
    res.status(500).json({error:'Não foi possível concluir a operação. Tente novamente.',code:'INTERNAL_ERROR'});
  });
  return {app,db,close:async()=>{quotes.close();await db.close();}};
}
