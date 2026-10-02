import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import type { BootstrapData, Miner } from '../../shared/types';
import type { PortalProps } from './portal';
import { ApiError, post } from './api';

export type CycleCommand = 'activate' | 'pause' | 'resume';

/**
 * The ignition is decorative; a confirmed server cycle owns the active state.
 * Pausing turns the machine off and freezes the confirmed cycle; resuming replays the
 * same ignition sequence, because the machine only appears powered on after the server
 * confirms the running cycle.
 */
export function useMinerActivation({ refresh, notify }: Pick<PortalProps, 'refresh' | 'notify'>) {
  const reducedMotion = useReducedMotion();
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [action, setAction] = useState<CycleCommand | null>(null);
  const busy = useRef(false);
  const attempts = useRef(new Map<string, string>());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; timers.current.forEach(clearTimeout); };
  }, []);

  const ignite = (minerId: string, message: string) => {
    if (!mounted.current) return;
    setStartingId(minerId);
    setStep(reducedMotion ? 2 : 0);
    timers.current.forEach(clearTimeout);
    if (!reducedMotion) {
      timers.current.push(setTimeout(() => setStep(1), 700));
      timers.current.push(setTimeout(() => setStep(2), 2100));
    }
    timers.current.push(setTimeout(() => {
      setStartingId(null);
      busy.current = false;
    }, reducedMotion ? 160 : 3600));
    notify(message);
  };

  const command = async (miner: Miner | undefined, name: CycleCommand, eligible: (miner: Miner) => boolean, message: string) => {
    if (!miner || busy.current || !eligible(miner)) return;
    busy.current = true;
    setRequestingId(miner.id);
    setAction(name);
    const attemptKey = `${miner.id}:${name}`;
    const key = attempts.current.get(attemptKey) ?? crypto.randomUUID();
    attempts.current.set(attemptKey, key);
    try {
      const confirmed = await post<BootstrapData>('/miners/' + miner.id + '/' + name, { idempotencyKey: key });
      const cycle = confirmed.miners.find(item => item.id === miner.id);
      if (name === 'pause') {
        if (cycle?.status !== 'PAUSED') throw new Error('A confirmação da pausa precisa ser atualizada. Tente novamente.');
      } else if (cycle?.status !== 'MINING' || !cycle.cycleEndsAt) {
        throw new Error(name === 'resume'
          ? 'A retomada ainda não foi confirmada pelo servidor. Tente novamente.'
          : 'A confirmação do ciclo precisa ser atualizada. Tente novamente.');
      }
      await refresh(confirmed);
      attempts.current.delete(attemptKey);
      if (!mounted.current) return;
      setRequestingId(null);
      setAction(null);
      // Only a confirmed running cycle shows the power-on sequence.
      if (name === 'pause') { busy.current = false; notify(message); return; }
      ignite(miner.id, message);
    } catch (error) {
      // Uncertain network/server responses retain the same key for a safe retry.
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) attempts.current.delete(attemptKey);
      if (error instanceof ApiError && error.code === 'CYCLE_RECEIPT_EXPIRED') await refresh().catch(() => {});
      if (mounted.current) { setRequestingId(null); setAction(null); notify((error as Error).message, 'error'); }
      busy.current = false;
    }
  };

  const activate = (miner?: Miner) => command(miner, 'activate', item => item.status === 'READY', 'Ativação confirmada. Seu ciclo de 24h está em andamento.');
  const pause = (miner?: Miner) => command(miner, 'pause', item => item.status === 'MINING', 'Ciclo pausado. A máquina foi desligada e o tempo restante ficou congelado.');
  const resume = (miner?: Miner) => command(miner, 'resume', item => item.status === 'PAUSED', 'Máquina religada. O ciclo retomou com o tempo que restava.');

  return { activate, pause, resume, requestingId, startingId, step, action, busy: Boolean(requestingId || startingId) };
}
