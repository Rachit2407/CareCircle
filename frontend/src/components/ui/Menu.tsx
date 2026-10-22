import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

export type MenuItem =
  | { kind: 'link'; to: string; label: string; icon: LucideIcon }
  | { kind: 'action'; label: string; icon: LucideIcon; onSelect: () => void; disabled?: boolean };

interface MenuProps {
  /** Accessible name of the menu. */
  label: string;
  /** A button element; it receives the open/close behaviour. */
  trigger: ReactElement;
  items: readonly MenuItem[];
  align?: 'start' | 'end';
}

const ITEM_CLASS =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-base font-bold text-ink outline-none data-[disabled]:opacity-60 data-[highlighted]:bg-navy-100';

/** Keyboard-operable menu (arrow keys, Escape, focus return) built on Radix. */
export function Menu({ label, trigger, items, align = 'end' }: MenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          aria-label={label}
          align={align}
          sideOffset={8}
          className="z-50 min-w-60 animate-settle rounded-2xl border border-line bg-paper p-2 shadow-lift"
        >
          {items.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-navy-700" />
                {item.label}
              </>
            );
            return item.kind === 'link' ? (
              <DropdownMenu.Item key={item.label} asChild>
                <Link to={item.to} className={ITEM_CLASS}>
                  {content}
                </Link>
              </DropdownMenu.Item>
            ) : (
              <DropdownMenu.Item
                key={item.label}
                disabled={item.disabled}
                onSelect={item.onSelect}
                className={ITEM_CLASS}
              >
                {content}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
