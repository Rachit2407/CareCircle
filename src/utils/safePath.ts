/** Accepts only in-app paths, so a crafted `from` can never redirect off-site or loop on auth pages. */
export function toSafeReturnPath(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  if (value.startsWith('/login') || value.startsWith('/register')) return fallback;
  return value;
}
