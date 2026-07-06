import { ImageResponse } from 'next/og'

// SynthVirtual favicon — the neon "V" mark, generated from the brand SVG.
// Swap SVG below when the final logo asset lands (keep it self-contained here).
export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="92" fill="#010502"/>
  <circle cx="100" cy="100" r="86" fill="none" stroke="#00ff41" stroke-width="6"/>
  <circle cx="100" cy="100" r="74" fill="none" stroke="#00ff41" stroke-opacity="0.4" stroke-width="2"/>
  <path d="M54 56 L100 146 L146 56" fill="none" stroke="#00ff41" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="100" cy="160" r="5" fill="#00ff41"/>
</svg>`

export default function Icon() {
  const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(SVG)}`
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: 'transparent' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUri} width={64} height={64} alt="SynthVirtual" />
      </div>
    ),
    { ...size },
  )
}
