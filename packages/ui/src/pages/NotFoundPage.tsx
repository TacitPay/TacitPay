import { SearchStatus } from 'iconsax-reactjs';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/DataStates';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <EmptyState
      icon={<SearchStatus size={24} variant="Linear" aria-hidden="true" />}
      title="Page not found"
      description="This route does not exist in the TacitPay Wave 1 shell."
      action={
        <Button asChild>
          <Link to="/">Return home</Link>
        </Button>
      }
    />
  );
}
