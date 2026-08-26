import { Lock } from 'iconsax-reactjs';

import { useTacitPay } from '@/lib/api';
import { endpointsFor } from '@/lib/api/deployment';
import { displayToken, formatAmount } from '@/lib/format';
import { cn } from '@/lib/utils';

import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export function PrivateAmount({
  amount,
  token = 'NIGHT',
  className,
  prominent = false,
}: {
  amount: bigint;
  token?: string;
  className?: string;
  prominent?: boolean;
}) {
  // Links may carry the raw 64-hex token type; render the network's display
  // symbol instead (break-all keeps even unknown hex inside the card).
  const { network } = useTacitPay();
  const label = displayToken(token, endpointsFor(network));
  return (
    <span className={cn('inline-flex items-center gap-1 tabular-nums', className)}>
      <span className={cn('font-medium break-all', prominent && 'text-2xl tracking-tight')}>
        {formatAmount(amount, label)}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Amount privacy information"
            className="-my-2 inline-flex size-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Lock size={15} variant="Linear" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Not visible on chain</TooltipContent>
      </Tooltip>
    </span>
  );
}
