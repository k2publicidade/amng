import { useId } from 'react';
import './visuals.css';

export interface BrandProps {
  compact?: boolean;
  className?: string;
}

/** Vector lockup adapted for the dark interface from the supplied AMNG logo. */
export function Brand({ compact = false, className = '' }: BrandProps) {
  const titleId = useId();
  return (
    <svg
      className={`visuals-brand ${compact ? 'visuals-brand--compact' : ''} ${className}`.trim()}
      viewBox={compact ? '0 0 48 44' : '0 0 312 65'}
      role="img"
      aria-labelledby={titleId}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id={titleId}>AMNG — Cloud Mining Service</title>
      {[0, 12, 24, 36].map((y, index) => (
        <g className={`visuals-brand-bar visuals-brand-bar--${index + 1}`} key={y}>
          <path d={`M0 ${y}h48v7H0z`} fill="#F32135" />
          <path d={`M0 ${y}h7v7H0z`} fill="#234CF2" />
        </g>
      ))}
      {!compact && (
        <>
          <g fill="currentColor">
            <path fillRule="evenodd" d="M65 43 84 0h13l19 43h-14l-3.3-8H81.8l-3.3 8H65Zm21.1-18h8.6l-4.3-10.5L86.1 25Z" />
            <path d="M123 43V0h14l14.5 25L166 0h14v43h-13V21l-13 22h-6l-12-22v22h-13Z" />
            <path d="M190 43V0h12l24 25V0h13v43h-12l-24-25v25h-13Z" />
            <path transform="translate(-22 0)" d="M330 43h-11l-.5-5.1c-4.2 4.2-10.2 6.5-17.4 6.5-16.1 0-29.1-9.1-29.1-22.9S284.5-1 301.6-1c11.6 0 21.3 4.4 26.2 11.5l-12.1 5.1c-2.8-4.1-7.4-6-13.2-6-9.1 0-16.4 4.5-16.4 11.9 0 7.6 7.3 12.2 16.4 12.2 6.4 0 11.7-2.4 13.7-6.1h-14.5v-10H330V43Z" />
          </g>
          <text x="65" y="62" fill="currentColor" className="visuals-brand-tagline" textLength="243" lengthAdjust="spacing">CLOUD MINING SERVICE</text>
        </>
      )}
    </svg>
  );
}

export default Brand;
