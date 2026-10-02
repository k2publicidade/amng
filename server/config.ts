import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { token } from './security.ts';

export interface Config {
  production:boolean;port:number;host:string;origin:string;databaseUrl?:string;sqlitePath:string;
  demoEnabled:boolean;sessionSecret:string;adminEmail?:string;adminPassword?:string;
  smtpHost?:string;smtpPort:number;smtpUser?:string;smtpPassword?:string;smtpFrom?:string;
  binanceEnabled:boolean;binanceApiUrl:string;binanceStreamUrl:string;
  twoPpApiUrl?:string;twoPpApiKey?:string;twoPpWebhookSecret?:string;
}
export function readConfig():Config {
  const production=process.env.NODE_ENV==='production';
  const databaseUrl=process.env.AMNG_DATABASE_URL||process.env.DATABASE_URL||undefined;
  const sqlitePath=process.env.SQLITE_PATH||'./data/amng.sqlite';
  let sessionSecret=process.env.SESSION_SECRET||'';
  if(!production&&(!sessionSecret||sessionSecret.startsWith('replace-with-'))){
    if(sqlitePath===':memory:')sessionSecret=token();
    else{
    const path=resolve(dirname(sqlitePath),'.session-secret');mkdirSync(dirname(path),{recursive:true});
    if(existsSync(path))sessionSecret=readFileSync(path,'utf8').trim();
    else{sessionSecret=token();writeFileSync(path,sessionSecret,{mode:0o600,flag:'wx'});}
    }
  }
  if(sessionSecret.length<32||production&&sessionSecret.startsWith('replace-with-'))throw new Error('SESSION_SECRET must be an exclusive secret containing at least 32 characters');
  if(production&&!databaseUrl)throw new Error('Production requires PostgreSQL DATABASE_URL; SQLite is development only');
  if(production&&process.env.DEMO_ENABLED==='true')throw new Error('Production demo requires a separate development deployment');
  const origin=process.env.APP_ORIGIN||'http://localhost:5173';
  if(production&&!origin.startsWith('https://'))throw new Error('Production APP_ORIGIN must use HTTPS');
  return {production,port:Number(process.env.PORT||3001),host:process.env.HOST||'127.0.0.1',origin,databaseUrl,sqlitePath,demoEnabled:production?false:process.env.DEMO_ENABLED!=='false',sessionSecret,adminEmail:process.env.ADMIN_EMAIL,adminPassword:process.env.ADMIN_PASSWORD,smtpHost:process.env.SMTP_HOST,smtpPort:Number(process.env.SMTP_PORT||587),smtpUser:process.env.SMTP_USER,smtpPassword:process.env.SMTP_PASSWORD,smtpFrom:process.env.SMTP_FROM,binanceEnabled:process.env.BINANCE_ENABLED!=='false',binanceApiUrl:process.env.BINANCE_API_URL||'https://api.binance.com',binanceStreamUrl:process.env.BINANCE_STREAM_URL||'wss://stream.binance.com:9443',twoPpApiUrl:process.env.TWO_PP_API_URL,twoPpApiKey:process.env.TWO_PP_API_KEY,twoPpWebhookSecret:process.env.TWO_PP_WEBHOOK_SECRET};
}
