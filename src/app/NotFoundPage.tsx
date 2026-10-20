import { SearchX } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { ButtonLink } from '@/components/ui/Button';
import { LANDING_ROUTE } from './routes';

/** Same message whether a page does not exist or is not available, so nothing is revealed. */
export function NotFoundPage() {
  return (
    <EmptyState
      icon={SearchX}
      title="We couldn’t find that page"
      description="The page may have moved, or it may not be available to you. Go back to your starting page."
      action={<ButtonLink to={LANDING_ROUTE}>Go to the start page</ButtonLink>}
    />
  );
}
