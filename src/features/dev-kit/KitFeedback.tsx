import { useEffect, useRef, useState } from 'react';
import { AiSuggestionPanel } from '@/components/common/AiSuggestionPanel';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { SavedRecordPanel } from '@/components/common/SavedRecordPanel';
import { StatusBadge } from '@/components/common/StatusBadge';
import { STATUS_MAP, type StatusKey } from '@/components/common/statusMap';
import { Button } from '@/components/ui/Button';
import { PendingNotice } from '@/components/ui/PendingNotice';
import { useToast } from '@/components/ui/Toast';
import { TOAST_CATALOG, type ToastKey } from '@/components/ui/toastCatalog';

const TOAST_KEYS = Object.keys(TOAST_CATALOG) as ToastKey[];
const STATUS_KEYS = Object.keys(STATUS_MAP) as StatusKey[];

export function KitFeedback() {
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function simulatePendingWrite(): void {
    setPending(true);
    timer.current = window.setTimeout(() => setPending(false), 3000);
  }

  return (
    <div className="space-y-10">
      <section aria-labelledby="kit-status" className="space-y-3">
        <h2 id="kit-status" className="text-2xl font-bold">
          Status badges
        </h2>
        <p className="text-ink-soft">One map drives every status. Each is a word plus an icon.</p>
        <ul className="flex flex-wrap gap-2">
          {STATUS_KEYS.map((key) => (
            <li key={key}>
              <StatusBadge status={key} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="kit-surfaces" className="space-y-3">
        <h2 id="kit-surfaces" className="text-2xl font-bold">
          AI suggestion and saved record
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <AiSuggestionPanel
            title="Create a task"
            footer={
              <>
                <Button>Confirm</Button>
                <Button variant="secondary">Edit</Button>
                <Button variant="ghost">Cancel</Button>
              </>
            }
          >
            Sample proposed action. Dashed border and badge mark it as not yet saved.
          </AiSuggestionPanel>
          <SavedRecordPanel
            title="Sample saved task"
            savedAt="2026-10-19T04:30:00Z"
            timeZone="Asia/Kolkata"
          >
            Sample persisted record. Solid border and a server timestamp with the time zone.
          </SavedRecordPanel>
        </div>
      </section>

      <section aria-labelledby="kit-feedback" className="space-y-3">
        <h2 id="kit-feedback" className="text-2xl font-bold">
          Dialogs, toasts and pending writes
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
            Open confirm dialog
          </Button>
          <Button variant="secondary" onClick={simulatePendingWrite} disabled={pending}>
            Simulate a pending write
          </Button>
          {TOAST_KEYS.map((key) => (
            <Button key={key} variant="ghost" onClick={() => toast.show(key)}>
              Toast: {key.replaceAll('_', ' ')}
            </Button>
          ))}
        </div>
        <PendingNotice pending={pending} />
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Remove this sample item?"
        description="Focus stays inside this dialog until you choose. Escape cancels."
        confirmLabel="Remove item"
        tone="danger"
        onConfirm={() => setConfirmOpen(false)}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
