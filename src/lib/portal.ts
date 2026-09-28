import type { BootstrapData } from '../../shared/types';
export interface PortalProps {
  data: BootstrapData;
  refresh: (confirmed?: BootstrapData) => Promise<void>;
  notify: (message: string, tone?: 'success' | 'error' | 'info') => void;
}
