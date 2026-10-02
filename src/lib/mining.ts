import { useEffect, useState } from 'react';
import type { Miner } from '../../shared/types';

export const minerLabel = (status: Miner['status']) => ({
  READY: 'Pronta para ativar',
  MINING: 'Ciclo em andamento',
  PAUSED: 'Ciclo pausado',
  EXPIRED: 'Contrato encerrado',
  CANCELLED: 'Cancelada',
}[status]);
/** Uppercase badge text shared by the fleet cards, the dashboard and the statement. */
export const minerStatusLabel = (status: Miner['status']) => ({
  READY: 'PRONTA',
  MINING: 'EM CICLO',
  PAUSED: 'PAUSADA',
  EXPIRED: 'ENCERRADA',
  CANCELLED: 'CANCELADA',
}[status]);
/**
 * A paused cycle freezes its clock: progress and remaining time are read at the pause
 * instant, so nothing advances while the machine is off.
 */
export const cycleClock = (miner: Miner, now = Date.now()) => (miner.pausedAt ? Date.parse(miner.pausedAt) : now);
export const elapsedRatio = (miner: Miner, now = Date.now()) => {
  if (!miner.cycleStartedAt || !miner.cycleEndsAt) return 0;
  const start = Date.parse(miner.cycleStartedAt), end = Date.parse(miner.cycleEndsAt);
  return Math.min(1, Math.max(0, (cycleClock(miner, now) - start) / Math.max(1, end - start)));
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
