import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Brand from './Brand';
import './visuals.css';

export interface PreloaderProps {
  ready: boolean;
  onComplete: () => void;
}

/** A bounded opening beat. Readiness never keeps the application covered indefinitely. */
export default function Preloader({ ready, onComplete }: PreloaderProps) {
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const startedAt = useRef<number | null>(null);
  const complete = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (startedAt.current === null) startedAt.current = performance.now();
    const deadline = window.setTimeout(() => setVisible(false), Math.max(0, 3000 - (performance.now() - startedAt.current)));
    return () => window.clearTimeout(deadline);
  }, []);

  useEffect(() => {
    if (!ready || !visible) return;
    const elapsed = startedAt.current === null ? 0 : performance.now() - startedAt.current;
    const finish = window.setTimeout(() => setVisible(false), Math.max(0, 900 - elapsed));
    return () => window.clearTimeout(finish);
  }, [ready, visible]);

  const finish = () => {
    if (complete.current) return;
    complete.current = true;
    onCompleteRef.current();
  };

  return (
    <AnimatePresence onExitComplete={finish}>
      {visible && (
        <motion.div
          className="visuals-preloader"
          key="amng-opening"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none' }}
          transition={{ duration: reducedMotion ? 0.12 : 0.36, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="visuals-preloader-content">
            <motion.div
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.48, ease: [0.22, 1, 0.36, 1] }}
            >
              <Brand className="visuals-preloader-brand" />
            </motion.div>
            <div className="visuals-preloader-rule" aria-hidden="true"><span /></div>
            <p className="visuals-preloader-label" role="status">PREPARANDO SUA OPERAÇÃO</p>
          </div>
          <span className="visuals-preloader-index" aria-hidden="true">AMNG / CLOUD MINING</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
