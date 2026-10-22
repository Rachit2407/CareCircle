import { BrandMark } from './BrandMark';

export function FullPageLoading() {
  return (
    <div role="status" className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4">
        <BrandMark className="h-16 w-16 animate-pulse" />
        <p className="font-display text-xl font-bold">Loading CareCircle</p>
      </div>
    </div>
  );
}
