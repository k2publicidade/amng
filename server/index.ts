import { existsSync } from 'node:fs';
import { readConfig } from './config.ts';
import { createApplication } from './app.ts';

if(existsSync('.env'))process.loadEnvFile('.env');
const config=readConfig();
const runtime=await createApplication(config);
const server=runtime.app.listen(config.port,config.host,()=>{
  console.log(JSON.stringify({event:'server_started',host:config.host,port:config.port,environment:config.production?'production':'development'}));
});
let closing=false;
async function shutdown(){if(closing)return;closing=true;server.close(async()=>{await runtime.close();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
