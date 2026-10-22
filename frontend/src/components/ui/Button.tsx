import { LoaderCircle } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { ui } from '@/styles/tokens';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-marigold-400 text-navy-900 hover:bg-marigold-500',
  secondary: 'border-2 border-navy-700 bg-paper text-navy-800 hover:bg-navy-50',
  ghost: 'text-navy-800 hover:bg-navy-100',
  danger: 'bg-danger-fg text-paper hover:bg-ink',
};

const SIZES: Record<Size, string> = {
  md: 'px-5 py-2 text-base',
  lg: 'px-7 py-3 text-lg',
  icon: 'p-2',
};

function buttonStyles(variant: Variant, size: Size, className?: string): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-full font-bold transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-60',
    ui.touchTarget,
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Disables the button and shows a spinner. Use while a request is pending. */
  loading?: boolean;
  /** Text shown while loading. Defaults to the normal children. */
  loadingText?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingText,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles(variant, size, className)}
      {...rest}
    >
      {loading && <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
});

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
}

/** A router link that looks like a button. */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: ButtonLinkProps) {
  return <Link className={buttonStyles(variant, size, className)} {...rest} />;
}
