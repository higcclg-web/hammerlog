// Renders the Hammerlog anvil mark into the full PWA icon set.
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
const icons = join(pub, 'icons')
await mkdir(icons, { recursive: true })

// content scale < 1 shrinks the mark toward the center (maskable safe zone)
function markSvg({ size = 512, background = true, contentScale = 1 }) {
  const s = 512
  const pad = (1 - contentScale) / 2
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="32%" r="85%">
      <stop offset="0%" stop-color="#232327"/>
      <stop offset="100%" stop-color="#0a0a0b"/>
    </radialGradient>
    <linearGradient id="iron" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffb02e"/>
      <stop offset="55%" stop-color="#ff7a1f"/>
      <stop offset="100%" stop-color="#f24e12"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ff7a1f" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#ff7a1f" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ${background ? `<rect width="${s}" height="${s}" fill="url(#bg)"/>` : ''}
  <g transform="translate(${s * pad} ${s * pad}) scale(${contentScale})">
    <ellipse cx="256" cy="300" rx="215" ry="150" fill="url(#glow)"/>
    <g fill="url(#iron)">
      <!-- horn -->
      <path d="M150 168 C 105 172 62 190 34 220 C 68 238 112 250 150 256 Z"/>
      <!-- face -->
      <rect x="132" y="150" width="330" height="106" rx="16"/>
      <!-- waist -->
      <path d="M212 256 h170 v34 c0 22 15 41 37 47 l26 7 c10 3 10 12 0 15 l-26 7 h-244 l-26 -7 c-10 -3 -10 -12 0 -15 l26 -7 c22 -6 37 -25 37 -47 Z"/>
      <!-- base -->
      <path d="M196 322 h202 l36 44 h-274 Z"/>
      <rect x="140" y="366" width="314" height="34" rx="10"/>
    </g>
    <!-- spark -->
    <path d="M96 84 L108 116 L140 128 L108 140 L96 172 L84 140 L52 128 L84 116 Z" fill="#ffd166"/>
    <circle cx="170" cy="96" r="8" fill="#ff9d2e"/>
    <circle cx="130" cy="52" r="5" fill="#ff7a1f"/>
  </g>
</svg>`
}

async function png(svg, size, out, { flatten = false } = {}) {
  let img = sharp(Buffer.from(svg)).resize(size, size)
  if (flatten) img = img.flatten({ background: '#0a0a0b' })
  await img.png().toFile(out)
  console.log('wrote', out)
}

await png(markSvg({ background: true }), 192, join(icons, 'icon-192.png'))
await png(markSvg({ background: true }), 512, join(icons, 'icon-512.png'))
await png(markSvg({ background: true, contentScale: 0.72 }), 512, join(icons, 'maskable-512.png'))
await png(markSvg({ background: true }), 180, join(pub, 'apple-touch-icon.png'), { flatten: true })
await png(markSvg({ background: true }), 32, join(icons, 'favicon-32.png'))
await writeFile(join(pub, 'favicon.svg'), markSvg({ background: true }))
console.log('icon set complete')
