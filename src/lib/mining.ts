import { useEffect, useState } from 'react';
import type { Miner } from '../../shared/types';

export const minerLabel = (status: Miner['status']) => ({ READY: 'Pronta para ativar', MINING: 'Ciclo em andamento', EXPIRED: 'Contrato encerrado', CANCELLED: 'Cancelada' }[status]);
export const elapsedRatio = (miner: Miner, now = Date.now()) => {
  if (!miner.cycleStartedAt || !miner.cycleEndsAt) return 0;
  const start = Date.parse(miner.cycleStartedAt), end = Date.parse(miner.cycleEndsAt);
  return Math.min(1, Math.max(0, (now - start) / Math.max(1, end - start)));
};
export const countdown = (end: string | null, now = Date.now()) => {
  if (!end) return '—';
  const seconds = Math.min(86400, Math.max(0, Math.ceil((Date.parse(end) - now) / 1000)));
  return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map(v => String(v).padStart(2, '0')).join(':');
};
export function useMiningClock(onCycleEnd?: () => void) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  return now;
}
