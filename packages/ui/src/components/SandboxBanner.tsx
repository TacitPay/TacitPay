import { Link } from 'react-router-dom';

import { useTacitPay } from '@/lib/api';

/**
 * The sandbox is a feature until it gets mistaken for the chain — and it was:
 * a connected wallet with a saved contract still runs every WRITE on the
 * in-memory mock until the contract is unlocked in Settings, and the mock's
 * success dialogs looked real enough to screenshot as evidence. This banner
 * makes the mode unmissable on every page that can write.
 */
export function SandboxBanner() {
  const { live, network } = useTacitPay();
  if (live) return null;
  return (
    // Amber, not red: red is this app's word for failure, and the sandbox is
    // provisional, not broken. Same caution register on both grounds via the
    // --sandbox tokens, so the banner cannot be mistaken for furniture.
    <div
      role="status"
      className="mb-6 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg border border-dashed border-[var(--sandbox-border)] bg-[var(--sandbox-bg)] px-4 py-3 text-sm text-[var(--sandbox-fg)]"
    >
      <span className="font-mono text-xs font-semibold tracking-widest uppercase">Sandbox</span>
      <span>
        Simulated data only — nothing on this page touches a chain. Connect a wallet and unlock the
        contract in{' '}
        <Link to="/settings" className="font-medium underline underline-offset-2">
          Settings
        </Link>{' '}
        to go live on {network}.
      </span>
    </div>
  );
}
