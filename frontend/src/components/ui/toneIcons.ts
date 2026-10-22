import {
  Circle,
  CircleAlert,
  CircleCheck,
  Info,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import type { Tone } from '@/styles/tokens';

/** Every tone has an icon, so status and tone are never conveyed by colour alone. */
export const TONE_ICONS: Record<Tone, LucideIcon> = {
  quiet: Circle,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
  ai: Sparkles,
};
