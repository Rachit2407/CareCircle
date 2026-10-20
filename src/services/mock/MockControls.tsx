import { FlaskConical } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { DEMO_CREDENTIALS } from './fixtures';
import {
  getScenario,
  MOCK_SCENARIOS,
  SCENARIO_COPY,
  setScenario,
  subscribeScenario,
} from './scenario';

/**
 * Developer panel, mounted in its own React root by installMocks(). The app never imports it,
 * so app components cannot tell whether they are talking to mocks or to the real API.
 */
export function MockControls() {
  const scenario = useSyncExternalStore(subscribeScenario, getScenario);
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-24 left-3 z-[55] flex max-w-[calc(100vw-1.5rem)] flex-col-reverse gap-2 md:bottom-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mock-controls-panel"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-navy-900 px-4 text-sm font-bold text-paper shadow-lift"
      >
        <FlaskConical aria-hidden="true" className="h-4 w-4" />
        Mock backend: {SCENARIO_COPY[scenario].label}
      </button>
      {open && (
        <section
          id="mock-controls-panel"
          aria-label="Mock backend controls"
          className="max-h-[70dvh] w-[22rem] max-w-full overflow-y-auto rounded-2xl border border-line bg-paper p-4 shadow-lift"
        >
          <fieldset>
            <legend className="font-display text-lg font-bold">Simulated backend response</legend>
            <div className="mt-2 space-y-1">
              {MOCK_SCENARIOS.map((id) => (
                <div key={id} className="flex min-h-11 items-start gap-3 py-1">
                  <input
                    id={`mock-scenario-${id}`}
                    type="radio"
                    name="mock-scenario"
                    value={id}
                    checked={scenario === id}
                    onChange={() => setScenario(id)}
                    className="mt-1 h-5 w-5 shrink-0 accent-navy-700"
                  />
                  <label htmlFor={`mock-scenario-${id}`} className="flex-1 cursor-pointer">
                    <span className="block font-bold">{SCENARIO_COPY[id].label}</span>
                    <span className="block text-sm text-ink-muted">{SCENARIO_COPY[id].effect}</span>
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
          <p className="mt-3 border-t border-line pt-3 text-sm text-ink-soft">
            Demo sign-in: <strong>{DEMO_CREDENTIALS.email}</strong> with password{' '}
            <strong>{DEMO_CREDENTIALS.password}</strong>.
          </p>
        </section>
      )}
    </div>
  );
}
