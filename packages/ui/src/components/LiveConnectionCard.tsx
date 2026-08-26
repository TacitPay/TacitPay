import { Link21, LinkCircle, ShieldTick, Warning2 } from 'iconsax-reactjs';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useTacitPay } from '@/lib/api';
import {
  clearStoredContractAddress,
  getContractAddress,
  getStoredContractAddress,
  isContractAddress,
  storeContractAddress,
} from '@/lib/api/deployment';
import { useLive } from '@/lib/api/live';

const BLOCKER_TEXT = {
  contract: 'Enter the address of a deployed TacitPay contract.',
  wallet: 'Connect a wallet first — signing and balancing both need one.',
  proving: 'No prover is available. Pick one under Proving mode.',
} as const;

/**
 * The control that takes the app off the mock adapter and onto a real chain.
 *
 * Two things are needed beyond a wallet: which contract to talk to, and the passphrase that
 * decrypts this browser's private state. Neither can be guessed — the address depends on
 * where TacitPay was deployed, and the passphrase is the only thing standing between a
 * shared machine and someone's invoice history.
 */
export function LiveConnectionCard() {
  const { network, live } = useTacitPay();
  const { state, blocker, connect, disconnect, observer } = useLive();
  // Prefilled from whatever is actually in effect — a stored address or one baked in at
  // build time. Showing an empty box while the app reads a real chain is a lie.
  const [address, setAddress] = useState(() => getContractAddress(network) ?? '');
  const [passphrase, setPassphrase] = useState('');
  const [touched, setTouched] = useState(false);
  const fromBuild = !getStoredContractAddress(network) && Boolean(getContractAddress(network));

  const addressValid = isContractAddress(address);
  const showAddressError = touched && address.length > 0 && !addressValid;
  const connecting = state.status === 'connecting';

  const saveAddress = () => {
    if (!storeContractAddress(network, address)) {
      setTouched(true);
      return;
    }
    toast.success(`Contract address saved for ${network}`);
  };

  const forget = () => {
    clearStoredContractAddress(network);
    setAddress('');
    disconnect();
    toast.info('Contract address cleared');
  };

  const onConnect = async (event: FormEvent) => {
    event.preventDefault();
    if (passphrase.length === 0) return;
    try {
      await connect(passphrase);
      // The passphrase is held only by the provider that derives the storage key from it.
      setPassphrase('');
      toast.success('Connected to the contract');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not connect.');
    }
  };

  return (
    <Card className={live ? 'border-primary/35 bg-accent/35' : undefined}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              {live ? (
                <Link21 size={18} variant="Linear" aria-hidden="true" />
              ) : (
                <LinkCircle size={18} variant="Linear" aria-hidden="true" />
              )}
              Contract connection
            </CardTitle>
            <CardDescription className="mt-2">
              {live
                ? 'This app is talking to a real contract. Amounts and memos stay on this device.'
                : observer
                  ? 'Public verification already reads this contract. Connect a wallet to create, pay or withdraw.'
                  : 'Without a contract address the app runs on an in-memory mock — nothing reaches a chain.'}
            </CardDescription>
          </div>
          {/* Three states, not two. Public reads go live as soon as an address exists,
              long before anyone connects a wallet — saying "Mock data" then is wrong. */}
          <Badge variant={live || observer ? 'default' : 'secondary'}>
            {live ? 'Live' : observer ? 'Public reads live' : 'Mock data'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="contract-address">Contract address</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="contract-address"
              className="min-w-64 flex-1 font-mono text-xs"
              placeholder="64 hex characters"
              spellCheck={false}
              autoComplete="off"
              value={address}
              onBlur={() => setTouched(true)}
              onChange={(event) => setAddress(event.target.value)}
            />
            <Button type="button" variant="outline" disabled={!addressValid} onClick={saveAddress}>
              Save
            </Button>
            {getStoredContractAddress(network) ? (
              <Button type="button" variant="ghost" onClick={forget}>
                Forget
              </Button>
            ) : null}
          </div>
          {showAddressError ? (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <Warning2 size={15} variant="Linear" aria-hidden="true" />A contract address is 64
              hexadecimal characters.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {fromBuild ? (
                <>
                  Built into this bundle for <strong>{network}</strong>. Saving a different one
                  overrides it in this browser.
                </>
              ) : (
                <>
                  <code className="font-mono text-xs">yarn demo:seed</code> prints one for a local
                  devnet. Saved per network, in this browser only.
                </>
              )}
            </p>
          )}
        </div>

        <Separator />

        {live ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ShieldTick size={16} variant="Linear" aria-hidden="true" />
              Private state is unlocked for this session only.
            </p>
            <Button type="button" variant="outline" onClick={disconnect}>
              Disconnect
            </Button>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={onConnect}>
            <div className="space-y-2">
              <Label htmlFor="private-state-passphrase">Private-state passphrase</Label>
              <Input
                id="private-state-passphrase"
                type="password"
                autoComplete="current-password"
                placeholder="Unlocks invoices and receipts stored on this device"
                value={passphrase}
                disabled={blocker !== null || connecting}
                onChange={(event) => setPassphrase(event.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Encrypts invoice bodies, salts and memos in this browser. It is never sent anywhere,
                and it cannot be recovered — choose one you will remember.
              </p>
            </div>

            {blocker ? (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Warning2 size={15} variant="Linear" aria-hidden="true" />
                {BLOCKER_TEXT[blocker]}
              </p>
            ) : null}

            {state.status === 'error' ? (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <Warning2 size={15} variant="Linear" aria-hidden="true" />
                {state.message}
              </p>
            ) : null}

            <Button type="submit" disabled={blocker !== null || connecting || !passphrase}>
              {connecting ? 'Connecting…' : 'Connect to contract'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
