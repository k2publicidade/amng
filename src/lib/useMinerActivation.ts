import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import type { BootstrapData, Miner } from '../../shared/types';
import type { PortalProps } from './portal';
import { ApiError, post } from './api';

/** The ignition is decorative; a confirmed server cycle owns the active state. */
export function useMinerActivation({ refresh, notify }: Pick<PortalProps, 'refresh' | 'notify'>) {
  const reducedMotion = useReducedMotion();
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const busy = useRef(false);
  const attempts = useRef(new Map<string, string>());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; timers.current.forEach(clearTimeout); };
  }, []);

  const activate = async (miner: Miner | undefined) => {
    if (!miner || miner.status !== 'READY' || busy.current) return;
    busy.current = true;
    setRequestingId(miner.id);
    const key = attempts.current.get(miner.id) ?? crypto.randomUUID();
    attempts.current.set(miner.id, key);
    try {
      const confirmed = await post<BootstrapData>('/miners/' + miner.id + '/activate', { idempotencyKey: key });
      const cycle = confirmed.miners.find(item => item.id === miner.id);
      if (cycle?.status !== 'MINING' || !cycle.cycleEndsAt) throw new Error('A confirmação do ciclo precisa ser atualizada. Tente novamente.');
      await refresh(confirmed);
      attempts.current.delete(miner.id);
      if (!mounted.current) return;
      setRequestingId(null);
      setStartingId(miner.id);
      setStep(0);
      timers.current.forEach(clearTimeout);
      if (!reducedMotion) {
        timers.current.push(setTimeout(() => setStep(1), 700));
        timers.current.push(setTimeout(() => setStep(2), 2100));
      }
      timers.current.push(setTimeout(() => {
        setStartingId(null);
        busy.current = false;
      }, reducedMotion ? 160 : 3600));
      notify('Ativação confirmada. Seu ciclo de 24h está em andamento.');
    } catch (error) {
      // Uncertain network/server responses retain the same key for a safe retry.
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) attempts.current.delete(miner.id);
      if (error instanceof ApiError && error.code === 'CYCLE_RECEIPT_EXPIRED') await refresh().catch(() => {});
      if (mounted.current) { setRequestingId(null); notify((error as Error).message, 'error'); }
      busy.current = false;
    }
  };

  return { activate, requestingId, startingId, step, busy: Boolean(requestingId || startingId) };
}
