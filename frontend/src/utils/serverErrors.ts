import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

/** Puts server (422) messages next to the matching fields. Returns true if any field was set. */
export function applyServerFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fieldErrors: Readonly<Record<string, string>>,
  fields: readonly Path<T>[],
): boolean {
  let applied = false;
  for (const name of fields) {
    const message = fieldErrors[name];
    if (message) {
      setError(name, { type: 'server', message });
      applied = true;
    }
  }
  return applied;
}
