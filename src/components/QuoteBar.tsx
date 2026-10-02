import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import type { BootstrapData } from '../../shared/types';
import { number } from '../lib/format';
import { useMiningClock } from '../lib/mining';
import { api } from '../lib/api';

type QuoteSnapshot = Pick<BootstrapData['dashboard'], 'quoteAsset' | 'quoteStatus' | 'quoteUpdatedAt' | 'quotes'>;

export default function QuoteBar({ data }: { data: BootstrapData }) {
  const [market, setMarket] = useState(data.dashboard);
  const [connected, setConnected] = useState(data.dashboard.quoteStatus === 'CONNECTED');
  const now = useMiningClock();
  useEffect(() => setMarket(data.dashboard), [data.dashboard]);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const value = await api<QuoteSnapshot>('/market/quotes');
        if (!active) return;
        setConnected(true);
        setMarket(old => ({ ...old, ...value }));
      } catch {
        if (active) setConnected(false);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const quotes = market.quotes.map(q => ({ ...q, usd: connected && market.quoteStatus === 'CONNECTED' && q.symbol && q.updatedAt && now - Date.parse(q.updatedAt) < 60_000 ? q.usd : null }));
  const live = connected && market.quoteStatus === 'CONNECTED' && quotes.some(q => q.usd !== null);
  return <div className="quote-bar"><span className="quote-source"><Activity size={14} /><span>BINANCE <small>{live ? 'AO VIVO' : 'SEM ATUALIZAÇÃO'}</small></span></span><div className="quote-list">{quotes.map(q => <span key={q.coin}><b>{q.coin}</b><strong>{q.usd === null ? 'Indisponível' : number(q.usd, q.usd < 1 ? 5 : 2)}</strong><small>{q.usd === null ? '' : (market.quoteAsset ?? 'USDT')}</small></span>)}</div><span className="quote-timestamp">{market.quoteUpdatedAt ? new Date(market.quoteUpdatedAt).toLocaleTimeString('pt-BR') : 'Aguardando fonte'}</span></div>;
}
