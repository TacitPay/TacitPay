import { Danger } from 'iconsax-reactjs';
import { Link } from 'react-router-dom';

import { Button } from './ui/button';

export function ProvingUnavailableNotice({ reason }: { reason?: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <Danger
          size={20}
          variant="Linear"
          className="shrink-0 text-destructive"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <p className="text-sm font-semibold">Choose an available proving mode</p>
          <p className="text-sm leading-6 text-muted-foreground">
            {reason ?? 'No proving option is available, so this transaction cannot start.'}
          </p>
        </div>
      </div>
      <Button asChild variant="outline" size="sm" className="mt-3">
        <Link to="/settings">Open proving settings</Link>
      </Button>
    </div>
  );
}
