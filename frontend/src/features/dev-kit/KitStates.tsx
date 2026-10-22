import { useQuery } from '@tanstack/react-query';
import { Inbox } from 'lucide-react';
import { useRef, useState } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { ResponsiveTable, TableSkeleton, type Column } from '@/components/common/ResponsiveTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import type { StatusKey } from '@/components/common/statusMap';
import { ApiError, type ApiErrorKind } from '@/services/api-error';
import { formatDateTime } from '@/utils/datetime';

/** Dev-only sample rows. The product UI never hardcodes data; this page is excluded from production. */
interface SampleRow {
  id: string;
  title: string;
  status: StatusKey;
  assignee: string;
  dueAt: string;
}

const SAMPLE_ROWS: readonly SampleRow[] = [
  {
    id: 'a',
    title: 'Sample task A',
    status: 'overdue',
    assignee: 'Sample member 1',
    dueAt: '2026-10-19T04:30:00Z',
  },
  {
    id: 'b',
    title: 'Sample task B',
    status: 'awaiting_confirmation',
    assignee: 'Unassigned',
    dueAt: '2026-10-20T09:00:00Z',
  },
  {
    id: 'c',
    title: 'Sample task C',
    status: 'queued',
    assignee: 'Sample member 2',
    dueAt: '2026-10-21T14:15:00Z',
  },
];

const COLUMNS: readonly Column<SampleRow>[] = [
  { key: 'title', header: 'Title', primary: true, cell: (row) => row.title },
  { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  { key: 'assignee', header: 'Assigned to', cell: (row) => row.assignee },
  {
    key: 'due',
    header: 'Due',
    cell: (row) => <time dateTime={row.dueAt}>{formatDateTime(row.dueAt, 'Asia/Kolkata')}</time>,
  },
];

const MODES = ['loading', 'empty', 'server', 'unconfirmed', 'forbidden', 'success'] as const;
type Mode = (typeof MODES)[number];
const MODE_LABEL: Record<Mode, string> = {
  loading: 'Stays loading',
  empty: 'Empty',
  server: 'Error, retry works',
  unconfirmed: 'Unconfirmed, check again',
  forbidden: 'No access',
  success: 'Success',
};
const FAILS_AS: Partial<Record<Mode, ApiErrorKind>> = {
  server: 'server',
  unconfirmed: 'unconfirmed',
  forbidden: 'forbidden',
};

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export function KitStates() {
  const [mode, setMode] = useState<Mode>('success');
  const attempts = useRef(0);

  // A real query run through the real QueryBoundary. Error modes fail once, so Retry succeeds.
  const query = useQuery({
    queryKey: ['dev-kit', mode],
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<readonly SampleRow[]> => {
      attempts.current += 1;
      await wait(900);
      if (mode === 'loading') return new Promise<never>(() => undefined);
      const kind = FAILS_AS[mode];
      if (kind && (kind === 'forbidden' || attempts.current === 1)) throw new ApiError(kind);
      return mode === 'empty' ? [] : SAMPLE_ROWS;
    },
  });

  return (
    <section aria-labelledby="kit-states" className="space-y-4">
      <h2 id="kit-states" className="text-2xl font-bold">
        List states
      </h2>
      <fieldset>
        <legend className="mb-2 font-bold">Simulate this result</legend>
        <div className="flex flex-wrap gap-2">
          {MODES.map((id) => (
            <label
              key={id}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 border-line bg-paper px-4 font-bold has-[:checked]:border-navy-700 has-[:checked]:bg-navy-50"
            >
              <input
                type="radio"
                name="kit-mode"
                checked={mode === id}
                onChange={() => {
                  attempts.current = 0;
                  setMode(id);
                }}
                className="accent-navy-700"
              />
              {MODE_LABEL[id]}
            </label>
          ))}
        </div>
      </fieldset>
      <QueryBoundary
        query={query}
        skeleton={<TableSkeleton />}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            icon={Inbox}
            title="Nothing here yet"
            description="Items appear here once someone adds them. Start with the New button."
          />
        }
      >
        {(rows) => (
          <ResponsiveTable
            caption="Sample rows"
            columns={COLUMNS}
            rows={rows}
            getRowKey={(row) => row.id}
          />
        )}
      </QueryBoundary>
    </section>
  );
}
