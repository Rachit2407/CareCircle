import { CircleAlert } from 'lucide-react';
import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  /** Inline validation message (client Zod error or server 422 message). */
  error?: string | undefined;
}

/** Every input is labelled; errors are linked with aria-describedby and never colour-only. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, id, className, required, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-base font-bold text-ink">
        {label}
        {required && <span className="ml-1.5 font-normal text-ink-muted">(required)</span>}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          'min-h-12 w-full rounded-xl border-2 border-line bg-paper px-4 text-lg text-ink',
          'placeholder:text-ink-muted hover:border-navy-200 focus-visible:border-navy-700',
          'aria-[invalid=true]:border-danger-fg',
          className,
        )}
        {...rest}
      />
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-bold text-danger-fg">
          <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});
