import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  /** `sheet` slides in from the left (mobile navigation). Default is a centred dialog. */
  variant?: 'center' | 'sheet';
}

/** Radix provides the focus trap, Escape handling, focus return and aria roles. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  variant = 'center',
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-ink/60" />
        <RadixDialog.Content
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'fixed z-50 overflow-y-auto bg-paper p-6 shadow-lift',
            variant === 'center' &&
              'left-1/2 top-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 animate-settle rounded-bubble',
            variant === 'sheet' &&
              'inset-y-0 left-0 w-[min(21rem,90vw)] rounded-r-bubble animate-settle',
          )}
        >
          <RadixDialog.Title className="pr-12 font-display text-2xl font-bold">
            {title}
          </RadixDialog.Title>
          {description && (
            <RadixDialog.Description className="mt-2 text-base text-ink-soft">
              {description}
            </RadixDialog.Description>
          )}
          {children && <div className="mt-4">{children}</div>}
          {footer && <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>}
          <RadixDialog.Close
            aria-label="Close"
            className="absolute right-3 top-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-soft hover:bg-navy-100"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
