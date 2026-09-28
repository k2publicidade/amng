import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Activity, ArrowRight, ArrowUpRight, Check, Cpu, GitBranch, ShieldCheck, Zap } from 'lucide-react';
import type { BootstrapData } from '../../shared/types';
import { post } from '../lib/api';
import { money, percent } from '../lib/format';
import { revealSection, fadeUp, scaleIn, staggerContainer, dynamicEase } from '../lib/animations';
import Brand from '../components/Brand';
import MinerVisual from '../components/MinerVisual';

interface Props { data: BootstrapData; authenticated: (data: BootstrapData) => void; notify: (message: string, tone?: 'success' | 'error' | 'info') => void }

export default function LandingPage({ data, authenticated, notify }: Props) {
  const [selected, setSelected] = useState('alph');
  const [busy, setBusy] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const navigate = useNavigate();
  const plan = data.plans.find(p => p.id === selected) ?? data.plans[0];
  const demo = async () => { setBusy(true); try { const value = await post<BootstrapData>('/auth/demo'); authenticated(value); navigate('/app'); } catch (error) { notify((error as Error).message, 'error'); } finally { setBusy(false); } };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <Link to="/" aria-label="American Mining"><Brand /></Link>
        <nav className={mobileMenu ? 'open' : ''}>
          <a href="#technology">A operação</a>
          <a href="#cloud-plans">Cloud Mining</a>
          <a href="#ecosystem">Ecossistema</a>
        </nav>
        <div>
          <Link className="landing-login" to={data.user ? '/app' : '/login'}>{data.user ? 'Minha operação' : 'Entrar'}<ArrowUpRight size={15} /></Link>
          <Link className="button button-primary" to="/register">Começar agora <ArrowUpRight size={15} /></Link>
          <button className="icon-button landing-menu" aria-label="Abrir menu" aria-expanded={mobileMenu} onClick={() => setMobileMenu(!mobileMenu)}>
            <span>☰</span>
          </button>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-grid" aria-hidden="true" />
          <motion.div
            className="hero-copy"
            initial="hidden"
            animate="visible"
            variants={staggerContainer(0.09, 0.1)}
          >
            <motion.p className="eyebrow" variants={fadeUp}>
              <span className="status-dot" />AMERICAN MINING / CLOUD MINING SERVICE
            </motion.p>
            <motion.h1 variants={fadeUp}>
              A NOVA FORÇA<br />DA <span>MINERAÇÃO.</span>
            </motion.h1>
            <motion.p className="hero-description" variants={fadeUp}>
              Tecnologia que você acompanha.<br />Uma operação que você controla.
            </motion.p>
            <motion.div className="hero-cta" variants={fadeUp}>
              <button className="button button-primary" disabled={busy} onClick={demo}>
                {busy ? 'Preparando demonstração...' : 'Explorar a plataforma'}<ArrowUpRight size={18} />
              </button>
              <a href="#cloud-plans" className="hero-text-link">Conheça as máquinas <ArrowRight size={17} /></a>
            </motion.div>
            <motion.p className="demo-caption" variants={fadeUp}>
              Uma experiência interativa. Dados demonstrativos, sem depósito.
            </motion.p>
            <motion.div className="hero-proof" variants={fadeUp}>
              <span><Cpu size={18} /><b>7</b> modelos Cloud</span>
              <span><Activity size={18} />Controle por ciclo</span>
              <span><ShieldCheck size={18} />Registro de cada crédito</span>
            </motion.div>
          </motion.div>

          <motion.div
            className="landing-machine"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: dynamicEase, delay: 0.2 }}
          >
            <span className="machine-side-caption">ENGINEERED FOR YOUR NEXT MOVE</span>
            <div className="landing-machine-orbit" aria-hidden="true" />
            <MinerVisual planId={selected} variant="hero" active />
            <div className="landing-machine-floor" aria-hidden="true" />
            <div className="landing-machine-details">
              <div>
                <small>EM EXIBIÇÃO / {String(data.plans.findIndex(p => p.id === selected) + 1).padStart(2, '0')}</small>
                <h2>{plan?.machine}</h2>
                <span>{plan?.coin} <b>·</b> {plan?.algorithm}</span>
              </div>
              <span className="landing-model-price">
                <small>Plano Cloud a partir de</small>
                <strong>{money(plan?.priceCents ?? 0)}</strong>
              </span>
            </div>
            <div className="landing-machine-selectors">
              {data.plans.map(p => (
                <button
                  key={p.id}
                  aria-label={'Exibir ' + p.machine}
                  aria-pressed={selected === p.id}
                  className={selected === p.id ? 'selected' : ''}
                  onClick={() => setSelected(p.id)}
                >
                  {p.coin}
                </button>
              ))}
            </div>
          </motion.div>

          <div className="landing-hero-footer">
            <span>01 — AMNG CONTROL CENTER</span>
            <a href="#technology">CONHEÇA A OPERAÇÃO <span>↓</span></a>
            <span>TECNOLOGIA. POTÊNCIA. CONEXÃO.</span>
          </div>
        </section>

        <motion.section
          id="technology"
          className="landing-section technology-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={revealSection}
        >
          <div className="section-intro">
            <p className="eyebrow">01 / SUA OPERAÇÃO, POR INTEIRO</p>
            <h2>MAIS VISIBILIDADE.<br /><span>EM CADA MOVIMENTO.</span></h2>
            <p>Máquinas, ciclos, carteiras e rede. Uma central para entender sua operação do começo ao crédito.</p>
          </div>
          <motion.div className="technology-features" variants={staggerContainer(0.08)}>
            {[
              { icon: PowerIcon, title: 'Ative. Acompanhe.', desc: 'Inicie seus ciclos Cloud e acompanhe o tempo até o próximo crédito confirmado.', n: '01' },
              { icon: ShieldCheck, title: 'Cada crédito tem origem.', desc: 'Carteiras com finalidade definida e um extrato que acompanha seus movimentos.', n: '02' },
              { icon: GitBranch, title: 'Veja sua rede evoluir.', desc: 'Conexões, potência e indicadores de carreira em uma visão clara.', n: '03' },
            ].map(f => (
              <motion.article key={f.n} variants={scaleIn} whileHover={{ y: -4, transition: { duration: 0.2 } }}>
                <span className="feature-number">{f.n}</span>
                <f.icon size={24} strokeWidth={1.4} />
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </motion.article>
            ))}
          </motion.div>
        </motion.section>

        <motion.section
          id="cloud-plans"
          className="landing-section cloud-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={revealSection}
        >
          <div className="section-intro">
            <p className="eyebrow">02 / CLOUD MINING</p>
            <h2>ESCOLHA SUA<br /><span>PRÓXIMA MÁQUINA.</span></h2>
            <p>Modelos definidos no catálogo AMNG. Explore preços, duração e as regras de cada plano.</p>
          </div>
          <motion.div className="landing-plan-grid" variants={staggerContainer(0.06)}>
            {data.plans.map((p, i) => (
              <motion.article key={p.id} variants={scaleIn} whileHover={{ y: -4, transition: { duration: 0.2 } }}>
                <header>
                  <span className="mono">0{i + 1} / {p.coin}</span>
                  <span className="coin-tag" style={{ color: p.color }}>{p.coin}</span>
                </header>
                <MinerVisual planId={p.id} variant="card" />
                <h3>{p.machine}</h3>
                <p>{p.algorithm} <span>·</span> {p.durationDays} dias</p>
                <div>
                  <strong>{money(p.priceCents)}</strong>
                  <button aria-label={'Ver ' + p.machine + ' na demonstração'} onClick={demo} disabled={busy}>
                    <ArrowUpRight size={22} />
                  </button>
                </div>
                <small>Regras financeiras sujeitas à aprovação operacional.</small>
              </motion.article>
            ))}
          </motion.div>
        </motion.section>

        <motion.section
          id="ecosystem"
          className="landing-section ecosystem-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={revealSection}
        >
          <p className="eyebrow">03 / UM ECOSSISTEMA CONECTADO</p>
          <h2>MINING IS JUST<br /><span>THE BEGINNING.</span></h2>
          <div className="ecosystem-line">
            {['CLOUD', 'POOL', 'HOST', 'OS', 'MARKET'].map((item, i) => (
              <motion.div key={item} variants={fadeUp}>
                <span className="mono">0{i + 1}</span>
                <strong>AMNG {item}</strong>
                <small>{i === 0 ? 'Sua central de mineração' : 'Integração em preparação'}</small>
              </motion.div>
            ))}
          </div>
          <motion.div className="landing-final-cta" variants={scaleIn}>
            <div>
              <h3>SUA PRÓXIMA OPERAÇÃO<br />COMEÇA AQUI.</h3>
              <p>Entre na demonstração e conheça a experiência.</p>
            </div>
            <button className="button button-primary" onClick={demo} disabled={busy}>
              Abrir plataforma <ArrowUpRight size={21} />
            </button>
          </motion.div>
        </motion.section>
      </main>

      <footer className="landing-footer">
        <Brand />
        <div>
          <p>AMERICAN MINING</p>
          <span>© {new Date().getFullYear()} AMNG. Cloud Mining Service.</span>
        </div>
        <p>Os indicadores financeiros exibidos na demonstração são ilustrativos. A operação real depende de regras aprovadas e integrações homologadas.</p>
        <Link to="/login">Entrar <ArrowUpRight size={16} /></Link>
      </footer>
    </div>
  );
}
function PowerIcon(props: { size?: number; strokeWidth?: number }) { return <Zap {...props} />; }
