import { Check, Power, Radio, Zap } from 'lucide-react';
import './ignition.css';

const stages = ['Ciclo confirmado', 'Inicializando visual da máquina', 'Ciclo em andamento'];

export default function IgnitionStatus({ step }: { step: number }) {
  return <div className="ignition-status" role="status" aria-live="polite" aria-atomic="true" data-step={step}>
    <div className="ignition-status-heading"><Zap size={14} /><span>{stages[step]}</span><b>{step === 2 ? 'ON' : 'BOOT'}</b></div>
    <div className="ignition-status-steps" aria-hidden="true">
      {[Power, Radio, Check].map((Icon, index) => <span key={index} className={index <= step ? 'complete' : ''}><Icon size={12} /><i /></span>)}
    </div>
    <div className="ignition-status-progress" aria-hidden="true"><span /></div>
  </div>;
}
