import type { Config } from 'tailwindcss';
import { backgroundImage, borderRadius, colors, fontFamily, shadows } from './src/styles/tokens';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors,
      fontFamily,
      borderRadius,
      boxShadow: shadows,
      backgroundImage,
      keyframes: {
        'dial-in': {
          from: { opacity: '0', transform: 'scale(0.94) rotate(-12deg)' },
          to: { opacity: '1', transform: 'scale(1) rotate(0deg)' },
        },
        settle: {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'dial-in': 'dial-in 900ms cubic-bezier(0.22, 1, 0.36, 1) both',
        settle: 'settle 180ms ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config;
