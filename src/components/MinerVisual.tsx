import { useEffect, useId, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { MINER_ACCENTS, minerAccent } from '../../shared/miner-theme';
import './visuals.css';

export interface MinerVisualProps {
  planId: string;
  active?: boolean;
  /** Entry sequence after the server has confirmed an active cycle. */
  starting?: boolean;
  className?: string;
  variant?: 'hero' | 'card' | 'compact';
}

type FanLocation = [x: number, y: number, radiusX: number, radiusY: number];
interface MinerVisualAsset { name: string; image: string; onImage: string; accent: string; ratio: [number, number]; fans: FanLocation[]; onTransform?: string; presentationScale?: number }

export const minerVisuals: Record<string, MinerVisualAsset> = {
  sc: { name: 'Goldshell SC BOX', image: '/assets/miners/sc.png', onImage: '/assets/miners/sc-on.png', accent: MINER_ACCENTS.sc, ratio: [1500, 1500], fans: [[.264, .53, .105, .16], [.310, .789, .087, .127]] },
  etc: { name: 'JASMINER X16', image: '/assets/miners/etc.png', onImage: '/assets/miners/etc-on.png', accent: MINER_ACCENTS.etc, ratio: [1200, 1200], fans: [[.343, .367, .045, .078], [.343, .56, .045, .078], [.345, .743, .045, .078]], onTransform: 'translate(-0.06%, 0.30%) scale(.994)', presentationScale: 1.24 },
  ckb: { name: 'ANTMINER K7', image: '/assets/miners/ckb.png', onImage: '/assets/miners/ckb-on.png', accent: MINER_ACCENTS.ckb, ratio: [1500, 1500], fans: [[.227, .569, .126, .164], [.249, .825, .105, .137]] },
  kda: { name: 'ANTMINER KA3', image: '/assets/miners/kda.png', onImage: '/assets/miners/kda-on.png', accent: MINER_ACCENTS.kda, ratio: [1500, 1500], fans: [[.203, .593, .115, .15], [.229, .845, .098, .13]] },
  alph: { name: 'ICERIVER AL3', image: '/assets/miners/alph.png', onImage: '/assets/miners/alph-on.png', accent: MINER_ACCENTS.alph, ratio: [1500, 1500], fans: [[.132, .468, .092, .156], [.159, .752, .086, .146]] },
  doge: { name: 'VOLCMINER D1', image: '/assets/miners/doge.png', onImage: '/assets/miners/doge-on.png', accent: MINER_ACCENTS.doge, ratio: [1500, 1500], fans: [[.184, .403, .112, .165], [.207, .762, .106, .156]] },
  btc: { name: 'Avalon A1566', image: '/assets/miners/btc.png', onImage: '/assets/miners/btc-on.png', accent: MINER_ACCENTS.btc, ratio: [1181, 1332], fans: [[.741, .354, .152, .154], [.741, .754, .148, .152]] },
};

/** A code-native illustration used only if a product photograph cannot load. */
function HardwareIllustration({ planId }: { planId: string }) {
  const illustrationId = useId();
  const short = planId === 'sc';
  const wide = planId === 'etc';
  const centers = wide ? [[-54, -15], [56, -15], [166, -15]] : short ? [[15, 12]] : [[15, -54], [15, 60]];
  return (
    <svg className="visuals-miner-fallback" viewBox="0 0 720 520" fill="none" role="img" aria-label="Representação visual de equipamento de mineração">
      <defs>
        <linearGradient id={`case-${illustrationId}`} x1="240" y1="85" x2="570" y2="450" gradientUnits="userSpaceOnUse">
          <stop stopColor="#707C88" /><stop offset=".4" stopColor="#36414B" /><stop offset="1" stopColor="#151C23" />
        </linearGradient>
        <linearGradient id={`top-${illustrationId}`} x1="260" y1="120" x2="470" y2="35" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4A5661" /><stop offset="1" stopColor="#8B949E" />
        </linearGradient>
        <linearGradient id={`front-${illustrationId}`} x1="130" y1="150" x2="360" y2="430" gradientUnits="userSpaceOnUse">
          <stop stopColor="#303943" /><stop offset=".5" stopColor="#0B1015" /><stop offset="1" stopColor="#202A33" />
        </linearGradient>
      </defs>
      <g transform={wide ? 'translate(-20 56) scale(1 .8)' : short ? 'translate(30 58) scale(.96 .78)' : undefined}>
        <path d="m198 146 255-57 131 49-264 72-122-64Z" fill={`url(#top-${illustrationId})`} stroke="#89939D" />
        <path d="m320 210 264-72-5 267-259 87V210Z" fill={`url(#case-${illustrationId})`} stroke="#7C8791" />
        <path d="m198 146 122 64v282l-130-76 8-270Z" fill={`url(#front-${illustrationId})`} stroke="#4A555F" />
        <path d="m329 219 244-67v246l-244 81V219Z" stroke="#5F6A75" opacity=".6" />
        {[0, 1, 2, 3].map((i) => <path key={i} d={`m${340 + i * 52} ${215 - i * 14} 0 255`} stroke="#8B97A3" opacity=".13" />)}
        <path d="m340 225 215-57m-215 307 212-72" stroke="#B3BCC5" strokeWidth="2" opacity=".35" />
        <path d="m390 174 27-8 18 7-27 8-18-7Z" fill="#111A20" stroke="#6F7B85" />
        <g transform={wide ? 'translate(252 305) scale(.64 .92)' : short ? 'translate(254 290) scale(.83 1.35)' : 'translate(255 320) scale(.83 1.05)'}>
          {centers.map(([x, y]) => (
            <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
              <rect x="-56" y="-56" width="112" height="112" rx="4" fill="#0B0F13" stroke="#72808C" />
              <circle r="48" fill="#05090D" stroke="#6F7A83" strokeWidth="2" />
              {[0, 60, 120, 180, 240, 300].map((rotation) => <path key={rotation} d="M0-8C-10-40 16-49 23-35 12-30 7-16 6-5Z" transform={`rotate(${rotation})`} fill="#28333D" stroke="#4B5863" strokeWidth=".6" />)}
              {[17, 24, 31, 38, 45].map((radius) => <circle key={radius} r={radius} stroke="#71808D" strokeWidth="1.1" opacity=".75" />)}
              <path d="M-41-41 41 41M41-41-41 41" stroke="#ABB6BE" strokeWidth="1.4" />
              <circle r="10" fill="#111820" stroke="#64727F" /><circle r="3" fill="#8C98A3" />
              {[-1, 1].flatMap((dx) => [-1, 1].map((dy) => <g key={`${dx}${dy}`} transform={`translate(${dx * 50} ${dy * 50})`}><circle r="2.8" fill="#B2BBC4" /><path d="M-1.7 0h3.4" stroke="#303A43" strokeWidth=".8" /></g>))}
            </g>
          ))}
        </g>
        {[240, 430].map((y) => <circle key={y} cx="552" cy={y - 85} r="2" fill="#A8B4BE" />)}
        <path d="m449 311 44-13v32l-44 14v-33Z" fill="#1A242D" stroke="#728391" opacity=".7" />
        <path d="m459 315 23-7m-23 13 23-7m-23 13 23-7" stroke="#83939F" opacity=".7" />
      </g>
    </svg>
  );
}

/** Small fan-hub light movement is illustrative and does not expose physical telemetry. */
function PowerIllumination({ visual }: { visual: MinerVisualAsset }) {
  const [width, height] = visual.ratio;
  return <svg className="visuals-miner-power-light" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    {visual.fans.map(([x, y, radiusX, radiusY], index) => <g key={index} transform={`translate(${x * width} ${y * height})`} style={{ '--visuals-light-delay': `${index * 145}ms` } as CSSProperties}>
      <g transform={`scale(${radiusX * width} ${radiusY * height})`}>
        <circle className="visuals-miner-hub-halo" r=".28" />
        <g className="visuals-miner-fan-light">
          <circle r=".5" fill="transparent" />
          <circle className="visuals-miner-fan-trace" r=".47" />
        </g>
        <circle className="visuals-miner-hub-led" r=".045" />
      </g>
    </g>)}
  </svg>;
}

function MinerImage({ planId, variant, active, starting }: { planId: string; variant: MinerVisualProps['variant']; active: boolean; starting: boolean }) {
  const [failed, setFailed] = useState(false);
  const [onFailed, setOnFailed] = useState(false);
  const [onLoaded, setOnLoaded] = useState(false);
  const visual = minerVisuals[planId];
  const needsOnImage = variant === 'hero' || active || starting || onLoaded;
  useEffect(() => {
    if (!visual || !(variant === 'hero' || active || starting)) return;
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => { setOnLoaded(true); setOnFailed(false); };
    image.onerror = () => setOnFailed(true);
    image.src = visual.onImage;
    return () => { image.onload = null; image.onerror = null; };
  }, [visual, variant, active, starting]);
  if (!visual || failed) return <><HardwareIllustration planId={planId} /><span className="visuals-miner-caption">REPRESENTAÇÃO VISUAL</span></>;
  return <div className={`visuals-miner-layers ${onFailed || !onLoaded ? 'visuals-miner-layers--on-unavailable' : ''}`} role="img" aria-label={`${visual.name} — imagem de referência${active ? ', iluminação visual do ciclo ativo' : ''}`}>
    <img className="visuals-miner-image visuals-miner-image--off" src={visual.image} alt="" aria-hidden="true" loading={variant === 'hero' ? 'eager' : 'lazy'} fetchPriority={variant === 'hero' ? 'high' : 'auto'} decoding="async" draggable={false} onError={() => setFailed(true)} />
    {needsOnImage && <img className="visuals-miner-image visuals-miner-image--on" src={visual.onImage} alt="" aria-hidden="true" loading={variant === 'hero' || active || starting ? 'eager' : 'lazy'} fetchPriority={variant === 'hero' && active ? 'high' : 'auto'} decoding="async" draggable={false} onLoad={() => { setOnLoaded(true); setOnFailed(false); }} onError={() => setOnFailed(true)} />}
    <PowerIllumination visual={visual} />
  </div>;
}

/** Selection and activation follow the parent state confirmed by the server. */
export default function MinerVisual({ planId, active = false, starting = false, className = '', variant = 'card' }: MinerVisualProps) {
  const reducedMotion = useReducedMotion();
  const visual = minerVisuals[planId];
  const style = { '--visuals-miner-accent': visual?.accent ?? minerAccent(planId), '--visuals-on-transform': visual?.onTransform ?? 'none' } as CSSProperties;
  const scale = visual?.presentationScale ?? 1;
  return (
    <div className={`visuals-miner visuals-miner--${variant} ${active ? 'visuals-miner--active' : ''} ${active && starting ? 'visuals-miner--starting' : ''} ${className}`.trim()} style={style} data-plan={planId}>
      <div className="visuals-miner-aura" aria-hidden="true" />
      <div className="visuals-miner-platform" aria-hidden="true"><span /><span /><span /></div>
      <div className="visuals-miner-stage">
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            className="visuals-miner-product"
            key={planId}
            initial={reducedMotion ? { opacity: 0, scale } : { opacity: 0, x: 24, y: 8, scale: 0.97 * scale, clipPath: 'inset(0 18% 0 0)' }}
            animate={{ opacity: 1, x: 0, y: 0, scale, clipPath: 'inset(0 0% 0 0)' }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -20, y: -4, scale: 0.985 * scale, clipPath: 'inset(0 0 0 12%)' }}
            transition={{ duration: reducedMotion ? 0.16 : 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <MinerImage planId={planId} variant={variant} active={active} starting={active && starting} />
          </motion.div>
        </AnimatePresence>
      </div>
      {variant === 'hero' && <div className="visuals-miner-frame" aria-hidden="true"><i /><i /><i /><i /></div>}
    </div>
  );
}
