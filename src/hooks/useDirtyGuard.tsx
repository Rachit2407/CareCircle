import { useEffect, useRef, type ReactNode } from 'react';
import { useBlocker } from 'react-router-dom';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface DirtyGuard {
  /** Call right before an intentional navigation (for example after a confirmed save). */
  allowNavigation: () => void;
  /** Render this once inside the form's page. */
  dialog: ReactNode;
}

/** Asks before in-app navigation or a tab close discards unsaved input (spec section 5). */
export function useDirtyGuard(isDirty: boolean): DirtyGuard {
  const bypass = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !bypass.current && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent): void => {
      if (!bypass.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const dialog = (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      title="Discard your changes?"
      description="You have unsaved changes. If you leave now, what you typed will be lost."
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      tone="danger"
      onConfirm={() => {
        if (blocker.state === 'blocked') blocker.proceed();
      }}
      onCancel={() => {
        if (blocker.state === 'blocked') blocker.reset();
      }}
    />
  );

  return {
    allowNavigation: () => {
      bypass.current = true;
    },
    dialog,
  };
}
