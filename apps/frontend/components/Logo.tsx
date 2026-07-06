/**
 * SynthVirtual "V" mark — placeholder brand logo.
 *
 * A neon-green stylized "V" with circuit-board detailing, inside a glowing
 * tech HUD ring, on a transparent/black background (#00ff41 glow aesthetic).
 *
 * This is an editable React SVG so the final PNG/asset can be dropped in later:
 * swap the <path>/<circle> markup below (or replace the whole return with an
 * <img src="/logo.png" />) once the finished logo exists.
 */
export default function Logo({
  size = 32,
  glow = true,
  title = 'SynthVirtual',
}: {
  size?: number
  glow?: boolean
  title?: string
}) {
  const neon = '#00ff41'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      style={{ display: 'block', filter: glow ? 'drop-shadow(0 0 6px rgba(0,255,65,0.7))' : 'none' }}
    >
      <title>{title}</title>
      <defs>
        <filter id="v-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="v-core" cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor="#0a2a12" />
          <stop offset="100%" stopColor="#010502" />
        </radialGradient>
      </defs>

      {/* Dark disc backdrop */}
      <circle cx="100" cy="100" r="92" fill="url(#v-core)" />

      {/* Outer glowing ring + concentric inner ring (tech HUD) */}
      <g filter="url(#v-glow)">
        <circle cx="100" cy="100" r="88" stroke={neon} strokeOpacity="0.9" strokeWidth="2.5" />
        <circle cx="100" cy="100" r="78" stroke={neon} strokeOpacity="0.35" strokeWidth="1" />
      </g>

      {/* HUD tick marks around the ring */}
      <g stroke={neon} strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round">
        <line x1="100" y1="8"   x2="100" y2="18" />
        <line x1="100" y1="182" x2="100" y2="192" />
        <line x1="8"   y1="100" x2="18"  y2="100" />
        <line x1="182" y1="100" x2="192" y2="100" />
        <line x1="30"  y1="30"  x2="37"  y2="37" strokeOpacity="0.4" />
        <line x1="170" y1="30"  x2="163" y2="37" strokeOpacity="0.4" />
        <line x1="30"  y1="170" x2="37"  y2="163" strokeOpacity="0.4" />
        <line x1="170" y1="170" x2="163" y2="163" strokeOpacity="0.4" />
      </g>

      {/* The bold "V" — two thick strokes meeting at the bottom */}
      <g filter="url(#v-glow)">
        <path
          d="M56 58 L100 142 L144 58"
          stroke={neon}
          strokeWidth="15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Circuit lines branching off the V + small nodes */}
      <g stroke={neon} strokeOpacity="0.75" strokeWidth="2.5" strokeLinecap="round">
        <path d="M56 58 L40 58 L40 74" />
        <path d="M144 58 L160 58 L160 74" />
        <path d="M100 142 L100 158" />
        <path d="M78 100 L64 100" strokeOpacity="0.5" />
        <path d="M122 100 L136 100" strokeOpacity="0.5" />
      </g>
      <g fill={neon}>
        <circle cx="40" cy="74" r="3.5" />
        <circle cx="160" cy="74" r="3.5" />
        <circle cx="100" cy="158" r="3.5" />
        <circle cx="64" cy="100" r="2.5" fillOpacity="0.7" />
        <circle cx="136" cy="100" r="2.5" fillOpacity="0.7" />
      </g>
    </svg>
  )
}
