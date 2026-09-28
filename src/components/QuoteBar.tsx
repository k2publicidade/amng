import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import type { BootstrapData } from '../../shared/types';
import { number } from '../lib/format';

export default function QuoteBar({ data }: { data: BootstrapData }) {
  const [market, setMarket] = useState(data.dashboard);
  useEffect(() => setMarket(data.dashboard), [data.dashboard]);
  useEffect(() => {
    const stream = new EventSource('/api/market/stream');
    const handler = (event: MessageEvent) => { try { const value = JSON.parse(event.data); if (Array.isArray(value.quotes)) setMarket(old => ({ ...old, ...value })); } catch { /* The next valid event restores the ticker. */ } };
    stream.addEventListener('quotes', handler as EventListener);
    stream.onmessage = handler;
    return () => stream.close();
  }, []);
  const age = market.quoteUpdatedAt ? Date.now() - Date.parse(market.quoteUpdatedAt) : Infinity;
  const live = market.quoteStatus === 'CONNECTED' && age < 60000 && market.quotes.some(q => q.usd !== null);
  return <div className="quote-bar"><span className="quote-source"><Activity size={14} /><span>BINANCE <small>{live ? 'AO VIVO' : 'SEM ATUALIZAÇÃO'}</small></span></span><div className="quote-list">{market.quotes.map(q => <span key={q.coin}><b>{q.coin}</b><strong>{q.usd === null ? 'Indisponível' : number(q.usd, q.usd < 1 ? 5 : 2)}</strong><small>{q.usd === null ? '' : (market.quoteAsset ?? 'USDT')}</small></span>)}</div><span className="quote-timestamp">{market.quoteUpdatedAt ? new Date(market.quoteUpdatedAt).toLocaleTimeString('pt-BR') : 'Aguardando fonte'}</span></div>;
}
