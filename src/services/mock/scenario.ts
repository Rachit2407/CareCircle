export const MOCK_SCENARIOS = [
  'normal',
  'slow',
  'empty',
  'validation',
  'unauthorized',
  'server_error',
  'timeout',
] as const;

export type MockScenario = (typeof MOCK_SCENARIOS)[number];

export const SCENARIO_COPY: Record<MockScenario, { label: string; effect: string }> = {
  normal: { label: 'Normal', effect: 'Short delay, then success.' },
  slow: {
    label: 'Slow',
    effect:
      'Waits about 3.5 seconds so skeletons and pending states stay visible. Keep VITE_API_TIMEOUT_MS above 4000.',
  },
  empty: { label: 'Empty', effect: 'Success with no data (for example, no care circle yet).' },
  validation: { label: '422 validation', effect: 'Writes fail with field-level errors.' },
  unauthorized: {
    label: '401 unauthorized',
    effect: 'Every request says the session ended, or the credentials are wrong.',
  },
  server_error: { label: '500 server error', effect: 'Every request fails on the server side.' },
  timeout: {
    label: 'Timeout',
    effect:
      'Never answers. The client gives up after its timeout and shows "unconfirmed" for writes.',
  },
};

let current: MockScenario = 'normal';
const listeners = new Set<() => void>();

export function getScenario(): MockScenario {
  return current;
}

export function setScenario(next: MockScenario): void {
  current = next;
  listeners.forEach((listener) => listener());
}

export function subscribeScenario(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
