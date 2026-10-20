import { X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { tones } from '@/styles/tokens';
import { cn } from '@/utils/cn';
import { TONE_ICONS } from './toneIcons';
import { TOAST_CATALOG, type ToastKey } from './toastCatalog';

interface ToastApi {
  show: (key: ToastKey) => void;
}

interface ToastItem {
  id: number;
  key: ToastKey;
}

const ToastContext = createContext<ToastApi | null>(null);
const DISMISS_AFTER_MS = 9000;

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const { tone, title } = TOAST_CATALOG[item.key];
  const Icon = TONE_ICONS[tone];

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(item.id), DISMISS_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [item.id, onDismiss]);

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex animate-settle items-start gap-3 rounded-2xl border p-4 shadow-lift',
        tones[tone],
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="flex-1 font-bold">{title}</p>
      <button
        type="button"
        aria-label="Dismiss message"
        onClick={() => onDismiss(item.id)}
        className="-m-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-ink/10"
      >
        <X aria-hidden="true" className="h-5 w-5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback((key: ToastKey) => {
    nextId.current += 1;
    const id = nextId.current;
    setItems((current) => [...current.filter((item) => item.key !== key), { id, key }].slice(-3));
  }, []);

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 bottom-24 z-[60] flex flex-col gap-2 md:inset-x-auto md:bottom-6 md:right-6 md:w-[26rem]">
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside ToastProvider.');
  return api;
}
