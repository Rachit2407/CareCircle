import { PageHeader } from '@/components/common/PageHeader';
import { KitFeedback } from './KitFeedback';
import { KitStates } from './KitStates';

/**
 * Developer-only page (never in production builds) that exercises every shared primitive and
 * state, so Phase 1 can be reviewed before any feature screen exists.
 */
export function KitPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="UI kit"
        description="Developer-only. Use the Mock backend button to switch the simulated response, then sign out and in to see each case."
      />
      <KitStates />
      <KitFeedback />
    </div>
  );
}
