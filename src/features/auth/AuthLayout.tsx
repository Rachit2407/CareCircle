import type { ReactNode } from 'react';
import { BrandMark } from '@/components/common/BrandMark';
import { DayDial } from '@/components/common/DayDial';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** Sign-in and register frame. The dial is the one memorable moment; everything else is quiet. */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <div
        data-on-dark
        className="hidden flex-col justify-between gap-8 bg-navy-900 p-12 text-paper lg:flex"
      >
        <div className="flex items-center gap-3">
          <BrandMark className="h-10 w-10" />
          <span className="font-display text-2xl font-bold">CareCircle</span>
        </div>
        <DayDial className="mx-auto w-full max-w-md" />
        <p className="max-w-md font-display text-3xl font-bold leading-tight">
          Plan care with your family. Ask by voice or text, check what the assistant understood,
          then confirm.
        </p>
      </div>
      <main id="main" className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark className="h-10 w-10" />
            <span className="font-display text-2xl font-bold">CareCircle</span>
          </div>
          <h1 className="text-4xl font-bold">{title}</h1>
          <p className="mt-2 text-lg text-ink-soft">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
