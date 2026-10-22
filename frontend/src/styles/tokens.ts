/**
 * Design tokens: the single source of truth for colour, type, radius, shadow and the shared
 * surface classes. tailwind.config.ts imports this file; feature code uses Tailwind classes or
 * the `ui` / `tones` strings below. Raw hex values are only allowed here (enforced by ESLint).
 *
 * Direction: care is organised around the day, so the identity is navy ink + marigold, with a
 * four-part day palette (`daypart`) that returns in the header ribbon and the sign-in dial.
 */

export const colors = {
  chalk: '#F1F4F9',
  paper: '#FFFFFF',
  line: '#D7DEEA',
  ink: { DEFAULT: '#101931', soft: '#34405F', muted: '#55627F' },
  navy: {
    50: '#EAEEF8',
    100: '#D3DBEE',
    200: '#A8B6D8',
    600: '#2B3B70',
    700: '#1E2C5B',
    800: '#172249',
    900: '#101931',
  },
  marigold: { 50: '#FFF6DA', 100: '#FFE9A6', 400: '#F7BE35', 500: '#EFA90C', 700: '#7C5000' },
  daypart: { morning: '#F2AE12', afternoon: '#2F8FD6', evening: '#D45D87', night: '#3B4A93' },
  /** Reserved for AI-generated artifacts. Never use for saved records. */
  ai: { 50: '#F6EFFB', 100: '#EBDDF7', 300: '#C4A0E4', 700: '#5C2A86' },
  success: { bg: '#E4F3EA', fg: '#17663F', border: '#A9D8BC' },
  warning: { bg: '#FDF0D0', fg: '#7A4E00', border: '#EBCB84' },
  danger: { bg: '#FCE6E3', fg: '#A8261B', border: '#F0AFA8' },
  info: { bg: '#E4EEFA', fg: '#1B4F8F', border: '#A9C6E8' },
  quiet: { bg: '#E9ECF2', fg: '#34405F', border: '#CBD2DF' },
  focus: '#0B5FD1',
};

export const fontFamily: Record<string, string[]> = {
  display: ['"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
  sans: ['"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
};

/** Radius hierarchy: capsules for actions and badges, bubbles for panels, xl for inputs. */
export const borderRadius: Record<string, string> = { bubble: '1.75rem' };

export const shadows: Record<string, string> = {
  soft: '0 1px 2px rgba(16, 25, 49, 0.06), 0 12px 28px -14px rgba(16, 25, 49, 0.22)',
  lift: '0 2px 4px rgba(16, 25, 49, 0.1), 0 20px 44px -16px rgba(16, 25, 49, 0.36)',
};

export const backgroundImage: Record<string, string> = {
  'chalk-wash':
    'radial-gradient(46rem 28rem at 100% -10%, #E3ECFA 0%, transparent 62%), radial-gradient(40rem 26rem at -5% 108%, #FFF1CC 0%, transparent 58%)',
};

/** Status/tone chips. Always paired with a text label and an icon, never colour alone. */
export const tones = {
  quiet: 'bg-quiet-bg text-quiet-fg border-quiet-border',
  info: 'bg-info-bg text-info-fg border-info-border',
  success: 'bg-success-bg text-success-fg border-success-border',
  warning: 'bg-warning-bg text-warning-fg border-warning-border',
  danger: 'bg-danger-bg text-danger-fg border-danger-border',
  ai: 'bg-ai-100 text-ai-700 border-ai-300',
} as const;

export type Tone = keyof typeof tones;

export const ui = {
  /** 2.75rem is at least 44px at the 17px root size. */
  touchTarget: 'min-h-11 min-w-11',
  surface: {
    /** Saved record: solid border. Pair with a timestamp (SavedRecordPanel). */
    saved: 'rounded-bubble border border-solid border-line bg-paper shadow-soft',
    /** AI suggestion: dashed border. Pair with the AI badge (AiSuggestionPanel). */
    ai: 'rounded-bubble border-2 border-dashed border-ai-300 bg-ai-50',
  },
  aiBadge:
    'inline-flex items-center gap-1.5 rounded-full border border-ai-300 bg-ai-100 px-3 py-1 text-sm font-bold text-ai-700',
  link: 'font-bold text-navy-700 underline underline-offset-4 hover:text-navy-900',
} as const;
