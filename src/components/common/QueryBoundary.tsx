import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ErrorState } from './ErrorState';

interface QueryBoundaryProps<T> {
  query: UseQueryResult<T, Error>;
  skeleton: ReactNode;
  /** Shown instead of children when `isEmpty(data)` is true. */
  empty: ReactNode;
  isEmpty?: (data: T) => boolean;
  children: (data: T) => ReactNode;
}

/** One place for the loading / error+retry / empty / success pattern used by every list. */
export function QueryBoundary<T>({
  query,
  skeleton,
  empty,
  isEmpty,
  children,
}: QueryBoundaryProps<T>) {
  if (query.data === undefined) {
    if (query.isError) {
      return (
        <ErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      );
    }
    return (
      <div role="status" aria-live="polite">
        <span className="sr-only">Loading</span>
        {skeleton}
      </div>
    );
  }
  if (isEmpty?.(query.data)) return <>{empty}</>;
  return <>{children(query.data)}</>;
}
