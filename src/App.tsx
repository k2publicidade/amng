import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { Activity, ArrowDownToLine, ArrowUpRight, BarChart3, Bell, ChevronDown, CircleHelp, Cpu, Gauge, GitBranch, LayoutDashboard, LogOut, Menu, Search, Settings2, Shield, Sparkles, UserRound, Wallet, X } from 'lucide-react';
import type { BootstrapData } from '../shared/types';
import { canAccessAdmin } from '../shared/permissions';
import { api, post, setCsrfToken } from './lib/api';
import type { PortalProps } from './lib/portal';
import Brand from './components/Brand';
import Preloader from './components/Preloader';
import Dialog from './components/Dialog';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import PlansPage from './pages/PlansPage';
import EarningsPage from './pages/EarningsPage';

const MinersPage = lazy(() => import('./pages/MinersPage'));
const WalletsPage = lazy(async () => ({ default: (await import('./pages/WorkspacePages')).WalletsPage }));
const NetworkPage = lazy(async () => ({ default: (await import('./pages/WorkspacePages')).NetworkPage }));
const CareerPage = lazy(async () => ({ default: (await import('./pages/WorkspacePages')).CareerPage }));
const MarketPage = lazy(async () => ({ default: (await import('./pages/WorkspacePages')).MarketPage }));
const CyclesPage = lazy(async () => ({ default: (await import('./pages/WorkspacePages')).CyclesPage }));
const ProfilePage = lazy(async () => ({ default: (await import('./pages/WorkspacePages')).ProfilePage }));
const SupportPage = lazy(async () => ({ default: (await import('./pages/WorkspacePages')).SupportPage }));
const IntegrationsPage = lazy(async () => ({ default: (await import('./pages/WorkspacePages')).IntegrationsPage }));
const AdminPage = lazy(() => import('./pages/AdminPage'));

const nav = [
  { path: '/app', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { path: '/app/miners', label: 'Minhas máquinas', icon: Cpu },
  { path: '/app/plans', label: 'Explorar planos', icon: Sparkles },
  { path: '/app/earnings', label: 'Rendimentos', icon: BarChart3 },
  { path: '/app/wallets', label: 'Carteiras', icon: Wallet },
  { path: '/app/market', label: 'Hashrate Market', icon: Activity },
  { path: '/app/cycles', label: 'Ciclos', icon: Gauge },
  { path: '/app/network', label: 'Minha rede', icon: GitBranch },
  { path: '/app/career', label: 'Carreira', icon: Shield },
  { path: '/app/integrations', label: 'Ecossistema', icon: Settings2 },
];

function Shell({ data, refresh, notify }: PortalProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [notifications, setNotifications] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => { setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'instant' }); }, [location.pathname]);
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') refresh().catch(() => {}); }, 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebarRef.current?.querySelector<HTMLElement>('a,button')?.focus();
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
      if (e.key !== 'Tab') return;
      const list = sidebarRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])');
      if (!list?.length) return;
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [mobileOpen]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key === 'k') { event.preventDefault(); setSearchOpen(true); } };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  const logout = async () => { try { await post('/auth/logout'); window.location.assign('/'); } catch (error) { notify((error as Error).message, 'error'); } };
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent);
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Ir para o conteúdo</a>
    {mobileOpen && <button className="sidebar-backdrop" aria-label="Fechar navegação" onClick={() => setMobileOpen(false)} />}
    <aside ref={sidebarRef} className={'sidebar ' + (mobileOpen ? 'is-open' : '')} role={mobileOpen ? 'dialog' : undefined} aria-modal={mobileOpen || undefined} aria-label="Navegação da plataforma">
      <Link className="sidebar-brand" to="/app" aria-label="AMNG, visão geral"><Brand /><span>MINING CONTROL</span></Link>
      <div className="workspace-label"><span className="status-dot" />AMERICAN MINING<span className="workspace-version">V.01</span></div>
      <nav aria-label="Principal">{nav.map((item) => <div key={item.path}>{item.path === '/app/market' && <p className="nav-section">ECOSSISTEMA</p>}{item.path === '/app/network' && <p className="nav-section">SUA CONEXÃO</p>}<NavLink end={item.end} to={item.path} className={({ isActive }) => 'nav-link ' + (isActive ? 'active' : '')}><item.icon size={18} strokeWidth={1.6} /><span>{item.label}</span>{item.path === '/app/miners' && data.miners.length > 0 && <small>{data.miners.length.toString().padStart(2, '0')}</small>}</NavLink></div>)}</nav>
      <div className="sidebar-bottom">
        {canAccessAdmin(data.user) && <NavLink to="/app/admin" className={({ isActive }) => 'nav-link ' + (isActive ? 'active' : '')}><Shield size={18} /><span>Administração</span></NavLink>}
        <NavLink to="/app/support" className="nav-link"><CircleHelp size={18} /><span>Central de ajuda</span><ArrowUpRight size={14} /></NavLink>
        <Link to="/app/profile" className="sidebar-user"><span className="avatar">{data.user?.name.slice(0, 2).toUpperCase()}</span><div><strong>{data.user?.name}</strong><small>{data.mode === 'demo' ? 'Conta demonstrativa' : 'Minha conta'}</small></div><ChevronDown size={14} /></Link>
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <button className="icon-button mobile-menu" aria-label="Abrir navegação" onClick={() => setMobileOpen(true)}><Menu size={23} /></button>
        <Link className="topbar-mobile-brand" to="/app" aria-label="AMNG, início"><Brand /></Link>
        <div className="breadcrumb">PLATAFORMA <span>/</span> <strong>{nav.find(item => item.path === location.pathname)?.label ?? (location.pathname.includes('admin') ? 'Administração' : location.pathname.includes('support') ? 'Suporte' : 'Minha conta')}</strong></div>
        <div className="topbar-actions">
          <button className="search-trigger" onClick={() => setSearchOpen(true)}><Search size={17} /><span>Buscar na plataforma</span><kbd>{isMac ? '⌘ K' : 'Ctrl K'}</kbd></button>
          <div className="notification-wrapper"><button className="icon-button" aria-label="Notificações" aria-expanded={notifications} onClick={() => setNotifications(!notifications)}><Bell size={19} />{data.miners.some(m => m.status === 'READY') && <i />}</button>
            <AnimatePresence>
              {notifications && <motion.div className="notification-panel" initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }} transition={{ duration: 0.18, ease: 'easeOut' }}><h3>Sua operação</h3><p>{data.miners.filter(m => m.status === 'READY').length} máquina(s) disponível(is) para um novo ciclo.</p><Link to="/app/miners" onClick={() => setNotifications(false)}>Ver máquinas <ArrowUpRight size={14} /></Link><p className="muted">As regras e integrações pendentes podem ser consultadas no ecossistema.</p></motion.div>}
            </AnimatePresence>
          </div>
          <Link to="/app/wallets" className="button button-primary topbar-deposit"><ArrowDownToLine size={15} />Depositar</Link>
          <button className="icon-button logout-button" title="Sair da conta" aria-label="Sair da conta" onClick={logout}><LogOut size={17} /></button>
        </div>
      </header>
      {data.mode === 'demo' && <div className="demo-strip"><span><span className="status-dot" />DEMONSTRAÇÃO INTERATIVA</span><p>Valores ilustrativos em um ambiente isolado.</p><Link to="/register">Criar minha conta <ArrowUpRight size={13} /></Link></div>}
      <main id="main-content" className="main-content"><Suspense fallback={<div className="page-loading"><span className="loader-line" /><p>Carregando sua área...</p></div>}><Outlet /></Suspense></main>
      <footer className="workspace-footer"><span>© {new Date().getFullYear()} AMNG</span><span>American Mining <span className="footer-dot">·</span> Feito para acompanhar cada movimento.</span><Link to="/app/support">Precisa de ajuda? <ArrowUpRight size={11} /></Link></footer>
    </div>
    <nav className="mobile-bottom-nav" aria-label="Navegação mobile">{[{ path: '/app', label: 'Início', icon: LayoutDashboard, end: true }, { path: '/app/miners', label: 'Máquinas', icon: Cpu }, { path: '/app/earnings', label: 'Rendimentos', icon: BarChart3 }, { path: '/app/wallets', label: 'Carteira', icon: Wallet }, { path: '/app/profile', label: 'Conta', icon: UserRound }].map(item => <NavLink key={item.path} end={item.end} to={item.path} className={({ isActive }) => isActive ? 'active' : ''}><item.icon size={20} strokeWidth={1.6} /><span>{item.label}</span></NavLink>)}</nav>
    <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} title="Encontre seu próximo passo"><label className="field">Buscar<input autoFocus type="search" placeholder="Máquinas, carteiras, rede..." value={query} onChange={event => setQuery(event.target.value)} /></label><div className="search-results">{nav.filter(item => item.label.toLowerCase().includes(query.toLowerCase())).map(item => <button key={item.path} onClick={() => { navigate(item.path); setSearchOpen(false); setQuery(''); }}><item.icon size={19} /><span>{item.label}</span><ArrowUpRight size={16} /></button>)}{data.plans.filter(plan => query && (plan.name + plan.machine + plan.coin).toLowerCase().includes(query.toLowerCase())).map(plan => <button key={plan.id} onClick={() => { navigate('/app/plans?plan=' + plan.id); setSearchOpen(false); }}><Cpu size={19} /><span>{plan.name} <small>{plan.machine}</small></span><ArrowUpRight size={16} /></button>)}</div></Dialog>
  </div>;
}

export default function App() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [bootError, setBootError] = useState('');
  const [preloaded, setPreloaded] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' | 'info' } | null>(null);
  const bootstrapRevision = useRef(0);
  const refresh = useCallback(async (confirmed?: BootstrapData) => {
    const revision = ++bootstrapRevision.current;
    const value = confirmed ?? await api<BootstrapData>('/bootstrap');
    if (revision !== bootstrapRevision.current) return;
    setCsrfToken(value.csrfToken);
    setData(value);
    setBootError('');
  }, []);
  useEffect(() => { refresh().catch(error => setBootError((error as Error).message)); }, [refresh]);
  const notify = useCallback((message: string, tone: 'success' | 'error' | 'info' = 'success') => setToast({ message, tone }), []);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), 6000); return () => clearTimeout(timer); }, [toast]);
  const authenticated = (value: BootstrapData) => { ++bootstrapRevision.current; setCsrfToken(value.csrfToken); setData(value); };
  const props = data ? { data, refresh, notify } : null;
  return <MotionConfig reducedMotion="user">
    {!preloaded && <Preloader ready={Boolean(data || bootError)} onComplete={() => setPreloaded(true)} />}
    {bootError && <main className="fatal-error"><Brand /><h1>A conexão precisa de um instante.</h1><p>Não foi possível acessar a plataforma. Confira se a API está em execução.</p><p className="muted">{bootError}</p><button className="button button-primary" onClick={() => refresh().catch(error => setBootError((error as Error).message))}>Tentar novamente</button></main>}
    {data && props && <Routes>
      <Route path="/" element={<LandingPage data={data} authenticated={authenticated} notify={notify} />} />
      <Route path="/login" element={<AuthPage mode="login" authenticated={authenticated} notify={notify} />} />
      <Route path="/register" element={<AuthPage mode="register" authenticated={authenticated} notify={notify} />} />
      <Route path="/recover" element={<AuthPage mode="recover" authenticated={authenticated} notify={notify} />} />
      <Route path="/app" element={data.user ? <Shell {...props} /> : <Navigate to="/login" replace />}>
        <Route index element={<DashboardPage {...props} />} />
        <Route path="miners" element={<MinersPage {...props} />} />
        <Route path="plans" element={<PlansPage {...props} />} />
        <Route path="earnings" element={<EarningsPage {...props} />} />
        <Route path="wallets" element={<WalletsPage {...props} />} />
        <Route path="network" element={<NetworkPage {...props} />} />
        <Route path="career" element={<CareerPage {...props} />} />
        <Route path="market" element={<MarketPage {...props} />} />
        <Route path="cycles" element={<CyclesPage {...props} />} />
        <Route path="profile" element={<ProfilePage {...props} />} />
        <Route path="support" element={<SupportPage {...props} />} />
        <Route path="integrations" element={<IntegrationsPage {...props} />} />
        <Route path="admin" element={canAccessAdmin(data.user) ? <AdminPage {...props} /> : <Navigate to="/app" replace />} />
      </Route>
      <Route path="*" element={<main className="fatal-error"><Brand /><h1>Esta rota não está na operação.</h1><p>Volte à sua central para continuar.</p><Link className="button button-primary" to="/app">Ir para a plataforma</Link></main>} />
    </Routes>}
    <div className="toast-region" aria-live="polite" aria-atomic="true"><AnimatePresence>{toast && <motion.div key={toast.message} initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} className={'toast toast-' + toast.tone}><span>{toast.message}</span><button aria-label="Fechar notificação" onClick={() => setToast(null)}><X size={16} /></button></motion.div>}</AnimatePresence></div>
  </MotionConfig>;
}
