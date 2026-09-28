import { Check, Power, Radio, Zap } from 'lucide-react';
import './ignition.css';

const stages = ['Ativação confirmada', 'Acendendo iluminação', 'Ciclo em andamento'];

export default function IgnitionStatus({ step, replay = false }: { step: number; replay?: boolean }) {
  return <div className="ignition-status" role="status" aria-live="polite">
    <div className="ignition-status-heading"><Zap size={14} /><span>{replay && step === 0 ? 'Reproduzindo partida' : stages[step]}</span><b>{step === 2 ? 'ON' : 'BOOT'}</b></div>
    <div className="ignition-status-steps" aria-hidden="true">
      {[Power, Radio, Check].map((Icon, index) => <span key={index} className={index <= step ? 'complete' : ''}><Icon size={12} /><i /></span>)}
    </div>
    <div className="ignition-status-progress" aria-hidden="true"><span /></div>
  </div>;
}
