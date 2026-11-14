import type { ThemeSetArgs } from 'claude-code';

import { VIBES } from '../src/palette.ts';
import { makeColors } from './make-colors.js';

export const { theme: COLORS, problems: LOOK_PROBLEMS } = makeColors({
  label: 'Digital World',
  roles: { accent: '#2f8fd8', danger: '#d9455f', success: '#4a9a3c', warning: '#ec9128', pro: '#8a6fd1' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#e4f1fb',
        'surface-1': '#edf6fd',
        'surface-2': '#f6fbff',
        'text-primary': '#13263f',
        'text-secondary': '#33496a',
        'text-muted': '#4f6587'
      }
    },
    git: { added: '#3f9a3a', removed: '#d9455f', modified: '#2f8fd8' }
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#111a2e',
        'surface-1': '#172238',
        'surface-2': '#1d2a43',
        'surface-3': '#22304b',
        'text-primary': '#eef4ff',
        'text-secondary': '#c4d2ea',
        'text-muted': '#9eb0cf'
      }
    },
    git: { added: VIBES.leaf, removed: '#f2687c', modified: VIBES.sky }
  }
});

export const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
<style>
.drift{animation:drift 140s linear infinite alternate}
.drift.slow{animation-duration:220s}
.twinkle{animation:twinkle 6s ease-in-out infinite}
.twinkle.late{animation-delay:3s}
.dusk{opacity:0}
@keyframes drift{from{transform:translateX(-60px)}to{transform:translateX(60px)}}
@keyframes twinkle{0%,100%{opacity:.15}50%{opacity:.9}}
@media (prefers-color-scheme:dark){.dusk{opacity:.82}}
</style>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fb8ef"/><stop offset=".55" stop-color="#b9e0fa"/><stop offset="1" stop-color="#eef7ff"/></linearGradient>
<radialGradient id="haze" cx=".12" cy=".08" r=".7"><stop offset="0" stop-color="#f4bfdc" stop-opacity=".75"/><stop offset=".45" stop-color="#c8b3f0" stop-opacity=".45"/><stop offset="1" stop-color="#c8b3f0" stop-opacity="0"/></radialGradient>
<linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1530"/><stop offset=".6" stop-color="#1b2550"/><stop offset="1" stop-color="#3a3466"/></linearGradient>
<filter id="wash" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="3" seed="7"/><feDisplacementMap in="SourceGraphic" scale="38"/><feGaussianBlur stdDeviation="6"/></filter>
<filter id="soft"><feGaussianBlur stdDeviation="18"/></filter>
</defs>
<rect width="1600" height="1000" fill="url(#sky)"/>
<rect width="1600" height="1000" fill="url(#haze)"/>
<g class="drift" filter="url(#soft)" fill="#ffffff" opacity=".85">
<ellipse cx="1180" cy="170" rx="210" ry="70"/><ellipse cx="1290" cy="140" rx="140" ry="80"/><ellipse cx="1080" cy="200" rx="120" ry="50"/>
</g>
<g class="drift slow" filter="url(#soft)" fill="#ffffff" opacity=".7">
<ellipse cx="330" cy="300" rx="180" ry="55"/><ellipse cx="420" cy="270" rx="110" ry="65"/>
</g>
<path d="M0 760 L140 650 L260 700 L400 600 L560 690 L700 640 L860 720 L1010 620 L1160 690 L1320 610 L1460 680 L1600 640 L1600 1000 L0 1000Z" fill="#8fb2d8" opacity=".55" filter="url(#wash)"/>
<path d="M0 830 L180 740 L330 790 L520 720 L700 800 L900 760 L1100 820 L1290 740 L1450 790 L1600 750 L1600 1000 L0 1000Z" fill="#6f9fcb" opacity=".5" filter="url(#wash)"/>
<g filter="url(#wash)">
<ellipse cx="60" cy="900" rx="260" ry="170" fill="#4aa6c8" opacity=".7"/>
<ellipse cx="230" cy="960" rx="240" ry="120" fill="#5aa83c" opacity=".85"/>
<ellipse cx="-20" cy="780" rx="150" ry="140" fill="#3f8f3a" opacity=".8"/>
<ellipse cx="1560" cy="910" rx="260" ry="170" fill="#4aa6c8" opacity=".6"/>
<ellipse cx="1400" cy="975" rx="260" ry="110" fill="#7cc04a" opacity=".8"/>
<ellipse cx="1630" cy="800" rx="150" ry="150" fill="#3f8f3a" opacity=".75"/>
</g>
<rect class="dusk" width="1600" height="1000" fill="url(#night)"/>
<g fill="#ffffff">
<circle class="twinkle" cx="1420" cy="90" r="3"/><circle class="twinkle late" cx="1500" cy="220" r="2"/>
<circle class="twinkle late" cx="180" cy="120" r="2.5"/><circle class="twinkle" cx="90" cy="260" r="2"/>
<circle class="twinkle" cx="1320" cy="330" r="1.8"/><circle class="twinkle late" cx="260" cy="420" r="1.6"/>
</g>
</svg>`;

export const LOOK: ThemeSetArgs = {
  colors: COLORS,
  backdrop: { scene: 'digital-world' }
};
