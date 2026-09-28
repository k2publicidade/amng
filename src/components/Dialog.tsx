import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export default function Dialog({ open, onClose, title, children, className = '' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  return <dialog ref={ref} className={'dialog app-dialog ' + className} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => {
    if (event.target === ref.current) {
      const rect = ref.current!.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }
  }}>
    <header className="dialog-header"><h2>{title}</h2><button className="icon-button" aria-label="Fechar" onClick={onClose}><X size={20} /></button></header>
    <div className="dialog-body">{open && children}</div>
  </dialog>;
}
