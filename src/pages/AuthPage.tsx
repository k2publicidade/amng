import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Check, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { motion } from 'motion/react';
import type { BootstrapData } from '../../shared/types';
import { post, setCsrfToken } from '../lib/api';
import { dynamicEase, fadeUp } from '../lib/animations';
import Brand from '../components/Brand';
import MinerVisual from '../components/MinerVisual';
interface Props { mode: 'login' | 'register' | 'recover'; authenticated: (data: BootstrapData) => void; notify: (message: string, tone?: 'success' | 'error' | 'info') => void }

export default function AuthPage({ mode, authenticated, notify }: Props) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totp, setTotp] = useState('');
  const [referral, setReferral] = useState(params.get('ref') ?? '');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const resetToken = params.get('token');
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (mode === 'recover') { const result = await post<{ message: string; deliveryConfigured?: boolean; csrfToken?: string }>(resetToken ? '/auth/reset-confirm' : '/auth/reset-request', resetToken ? { token: resetToken, newPassword: password } : { email }); if (result.csrfToken) setCsrfToken(result.csrfToken); setSent(true); notify(result.message ?? 'Solicitação recebida.'); }
      else { const value = await post<BootstrapData>(mode === 'register' ? '/auth/register' : '/auth/login', mode === 'register' ? { name, email, password, referralCode: referral || undefined, termsAccepted: accepted } : { email, password, totp: totp || undefined }); authenticated(value); navigate('/app'); }
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  const demo = async () => { setBusy(true); setError(''); try { const value = await post<BootstrapData>('/auth/demo'); authenticated(value); navigate('/app'); } catch (err) { setError((err as Error).message); } finally { setBusy(false); } };
  return (
    <div className="auth-page">
      <motion.aside
        className="auth-art"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: dynamicEase }}
      >
        <Link to="/" className="auth-brand"><Brand /></Link>
        <div className="auth-art-copy">
          <p className="eyebrow">AMERICAN MINING</p>
          <h1>O CONTROLE<br />ESTÁ <span>COM VOCÊ.</span></h1>
          <p>Tecnologia. Potência. Conexão.</p>
        </div>
        <MinerVisual planId="alph" variant="hero" active />
        <span className="auth-art-bottom">AMNG / MINING CONTROL CENTER</span>
      </motion.aside>

      <main className="auth-main">
        <Link to="/" className="auth-back"><ArrowLeft size={15} />Voltar ao início</Link>
        <motion.div
          className="auth-form-wrap"
          key={mode + (resetToken ?? '')}
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: dynamicEase }}
        >
          <Link to="/" className="auth-mobile-brand"><Brand /></Link>
          <p className="eyebrow">{mode === 'register' ? 'SUA PRÓXIMA OPERAÇÃO' : mode === 'recover' ? 'ACESSO SEGURO' : 'BEM-VINDO À SUA CENTRAL'}</p>
          <h2>{mode === 'register' ? 'Crie sua conta.' : mode === 'recover' ? resetToken ? 'Nova senha.' : 'Recupere seu acesso.' : 'Entre na operação.'}</h2>
          <p>{mode === 'register' ? 'Um lugar para acompanhar máquinas, ciclos e conexões.' : mode === 'recover' ? 'Vamos ajudar você a voltar à plataforma.' : 'Sua operação está a um passo de você.'}</p>
          {sent ? (
            <div className="auth-confirmed">
              <Check size={30} />
              <h3>{resetToken ? 'Senha atualizada.' : 'Solicitação recebida.'}</h3>
              <p>{resetToken ? 'Use sua nova senha para entrar.' : 'Se esta conta estiver cadastrada e o serviço de envio estiver configurado, você receberá as instruções no e-mail.'}</p>
              <Link className="button button-primary" to="/login">Voltar para o login <ArrowUpRight size={16} /></Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              {mode === 'register' && (
                <label className="field">Nome completo
                  <input value={name} onChange={e => setName(e.target.value)} autoComplete="name" minLength={2} maxLength={80} required placeholder="Como podemos chamar você?" />
                </label>
              )}
              {!resetToken && (
                <label className="field">E-mail
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required placeholder="voce@exemplo.com" maxLength={180} />
                </label>
              )}
              {(mode !== 'recover' || resetToken) && (
                <label className="field">{resetToken ? 'Nova senha' : 'Senha'}
                  <span className="password-field">
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'login' ? 1 : 12} maxLength={128} required placeholder={mode === 'login' ? 'Sua senha' : 'Ao menos 12 caracteres'} />
                    <button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </span>
                </label>
              )}
              {mode === 'login' && (
                <>
                  <details className="auth-mfa">
                    <summary>Minha conta usa autenticação de dois fatores</summary>
                    <label className="field">Código do autenticador
                      <input inputMode="numeric" autoComplete="one-time-code" value={totp} onChange={e => setTotp(e.target.value)} pattern="[0-9]{6}" maxLength={6} placeholder="000000" />
                    </label>
                  </details>
                  <Link to="/recover" className="forgot-link">Esqueci minha senha</Link>
                </>
              )}
              {mode === 'register' && (
                <>
                  <label className="field">Código de indicação <span className="muted">(opcional)</span>
                    <input value={referral} onChange={e => setReferral(e.target.value)} maxLength={64} placeholder="Código de quem apresentou a AMNG" />
                  </label>
                  <label className="checkbox-field">
                    <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} required />
                    <span>Entendo que os recursos financeiros serão disponibilizados conforme as regras operacionais aprovadas da plataforma.</span>
                  </label>
                </>
              )}
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button-primary auth-submit" type="submit" disabled={busy}>
                {busy ? 'Aguarde...' : mode === 'register' ? 'Criar minha conta' : mode === 'recover' ? resetToken ? 'Salvar nova senha' : 'Enviar instruções' : 'Entrar na plataforma'}
                <ArrowUpRight size={18} />
              </button>
            </form>
          )}
          {mode !== 'recover' && (
            <>
              <div className="auth-divider"><span>OU CONHEÇA PRIMEIRO</span></div>
              <button className="button button-secondary auth-submit" disabled={busy} onClick={demo}>
                Abrir demonstração <ArrowUpRight size={17} />
              </button>
              <p className="auth-switch">
                {mode === 'register' ? 'Já tem uma conta?' : 'Ainda não tem conta?'}
                <Link to={mode === 'register' ? '/login' : '/register'}>{mode === 'register' ? 'Entrar' : 'Criar conta'}</Link>
              </p>
            </>
          )}
          <p className="auth-secure"><LockKeyhole size={13} />Seu acesso é pessoal. Nunca compartilhe seus códigos.</p>
        </motion.div>
        <span className="auth-copyright">© {new Date().getFullYear()} AMNG / CLOUD MINING SERVICE</span>
      </main>
    </div>
  );
}

