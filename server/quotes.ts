import { EventEmitter } from 'node:events';

const COINS=['SC','ETC','CKB','KDA','ALPH','DOGE','BTC'];
interface CachedQuote { price:number;at:number;symbol:string; }
export interface QuoteSnapshot {
  quoteAsset:'USDT';quoteStatus:'CONNECTING'|'CONNECTED'|'STALE'|'UNAVAILABLE';
  quoteUpdatedAt:string|null;
  quotes:{coin:string;usd:number|null;symbol:string|null;updatedAt:string|null}[];
}

/** Public Binance data only. A USDT quote is never silently presented as fiat USD. */
export class BinanceQuotes extends EventEmitter {
  private quotes=new Map<string,CachedQuote>();
  private pairs=new Map<string,string>();
  private socket:WebSocket|null=null;
  private timer:ReturnType<typeof setTimeout>|null=null;
  private stopped=false;
  private state:QuoteSnapshot['quoteStatus']='UNAVAILABLE';
  private retries=0;
  constructor(private enabled=true,private apiOrigin='https://api.binance.com',private streamOrigin='wss://stream.binance.com:9443') {super();}
  start(){if(this.enabled&&!this.stopped){this.state='CONNECTING';void this.connect();}}
  snapshot(now=Date.now()):QuoteSnapshot {
    let freshest=0;
    const quotes=COINS.map(coin=>{
      const cached=this.quotes.get(coin);const symbol=this.pairs.get(coin)??null;
      const currentPair=!!cached&&symbol===cached.symbol;
      const valid=currentPair&&now-cached!.at<60_000;
      if(valid)freshest=Math.max(freshest,cached!.at);
      return {coin,usd:valid?cached!.price:null,symbol,updatedAt:currentPair?new Date(cached!.at).toISOString():null};
    });
    return {quoteAsset:'USDT',quoteStatus:freshest?this.state==='CONNECTED'?'CONNECTED':'STALE':this.state==='CONNECTING'?'CONNECTING':'UNAVAILABLE',quoteUpdatedAt:freshest?new Date(freshest).toISOString():null,quotes};
  }
  private async fetchJson(path:string):Promise<unknown>{
    const response=await fetch(`${this.apiOrigin}${path}`,{signal:AbortSignal.timeout(7000),headers:{accept:'application/json'}});
    if(!response.ok)throw new Error(`Binance public API ${response.status}`);
    return response.json();
  }
  private async connect(){
    if(this.stopped)return;
    try{
      const exchange=await this.fetchJson('/api/v3/exchangeInfo') as {symbols?:{symbol:string;baseAsset:string;quoteAsset:string;status:string}[]};
      for(const coin of COINS){
        const market=exchange.symbols?.find(s=>s.baseAsset===coin&&s.quoteAsset==='USDT'&&s.status==='TRADING');
        if(market){this.pairs.set(coin,market.symbol);if(this.quotes.get(coin)?.symbol!==market.symbol)this.quotes.delete(coin);}
        else{this.pairs.delete(coin);this.quotes.delete(coin);}
      }
      if(!this.pairs.size)throw new Error('No eligible Binance spot pairs');
      const symbols=[...this.pairs.values()];
      const initial=await this.fetchJson(`/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(symbols))}`) as {symbol:string;price:string}[];
      for(const quote of initial)this.ingest(quote.symbol,quote.price,Date.now());
      if(this.stopped)return;
      const streams=symbols.map(s=>`${s.toLowerCase()}@miniTicker`).join('/');
      const socket=new WebSocket(`${this.streamOrigin}/stream?streams=${streams}`);this.socket=socket;
      socket.addEventListener('open',()=>{this.state='CONNECTED';this.retries=0;this.emit('update',this.snapshot());});
      socket.addEventListener('message',event=>{
        try{
          const message=JSON.parse(String(event.data)) as {data?:{s?:string;c?:string;E?:number}};
          if(message.data?.s&&message.data.c&&message.data.E)this.ingest(message.data.s,message.data.c,message.data.E);
        }catch{/* Malformed remote frames do not produce financial data. */}
      });
      socket.addEventListener('error',()=>{this.state='STALE';socket.close();});
      socket.addEventListener('close',()=>{if(this.socket===socket)this.socket=null;this.reconnect();});
    }catch{this.state='UNAVAILABLE';this.emit('update',this.snapshot());this.reconnect();}
  }
  private ingest(symbol:string,price:string,at:number){
    const coin=[...this.pairs.entries()].find(([,pair])=>pair===symbol)?.[0];const number=Number(price);
    if(!coin||!Number.isFinite(number)||number<=0||!Number.isSafeInteger(at)||at>Date.now()+60_000)return;
    const previous=this.quotes.get(coin);if(previous&&previous.at>at)return;
    this.quotes.set(coin,{price:number,at,symbol});this.emit('update',this.snapshot());
  }
  private reconnect(){
    if(this.stopped||this.timer)return;
    this.state=this.quotes.size?'STALE':'UNAVAILABLE';
    const delay=Math.min(60_000,5000*2**Math.min(this.retries++,4));
    this.timer=setTimeout(()=>{this.timer=null;void this.connect();},delay);this.timer.unref();
  }
  close(){this.stopped=true;if(this.timer)clearTimeout(this.timer);this.socket?.close();this.removeAllListeners();}
}
