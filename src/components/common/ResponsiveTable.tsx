import type { ReactNode } from 'react';
import { ui } from '@/styles/tokens';
import { cn } from '@/utils/cn';
import { Skeleton } from '../ui/Skeleton';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** The row's title: the row header in the table and the card heading on small screens. */
  primary?: boolean;
}

interface ResponsiveTableProps<T> {
  /** Names the table for screen readers. */
  caption: string;
  columns: readonly Column<T>[];
  rows: readonly T[];
  getRowKey: (row: T) => string;
}

/**
 * The one table primitive (Tasks, Appointments, Notifications, Family). A real table from md up,
 * stacked cards below, so there is never horizontal scrolling at 360px.
 */
export function ResponsiveTable<T>({ caption, columns, rows, getRowKey }: ResponsiveTableProps<T>) {
  const primary = columns.find((column) => column.primary) ?? columns[0];
  const rest = columns.filter((column) => column !== primary);
  if (!primary) return null;

  return (
    <>
      <div className={cn('hidden overflow-x-auto md:block', ui.surface.saved)}>
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="px-5 py-3 text-sm font-bold text-ink-muted"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getRowKey(row)} className="border-b border-line last:border-b-0">
                {columns.map((column) =>
                  column === primary ? (
                    <th key={column.key} scope="row" className="px-5 py-4 text-base font-bold">
                      {column.cell(row)}
                    </th>
                  ) : (
                    <td key={column.key} className="px-5 py-4 text-base">
                      {column.cell(row)}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul aria-label={caption} className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <li key={getRowKey(row)} className={cn(ui.surface.saved, 'p-4')}>
            <div className="font-display text-lg font-bold">{primary.cell(row)}</div>
            <dl className="mt-3 grid gap-2">
              {rest.map((column) => (
                <div
                  key={column.key}
                  className="flex flex-wrap items-baseline justify-between gap-x-4"
                >
                  <dt className="text-sm font-bold text-ink-muted">{column.header}</dt>
                  <dd className="text-base">{column.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Loading placeholder that fits both layouts. */
export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}
