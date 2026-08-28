import { Link21, LinkCircle, ShieldTick, Warning2 } from 'iconsax-reactjs';
import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { getErrorMessage } from '@/lib/errors';
import { useProving } from '@/lib/proving-context';

const BLOCKER_TEXT = {
  contract: 'Enter the address of a deployed TacitPay contract.',
  wallet: 'Connect a wallet first — signing and balancing both need one.',
  proving: 'No prover is available. Pick one under Proving mode.',
} as const;

// A non-secret breadcrumb: "a passphrase has been SET for this wallet on this
// device", written after the first successful unlock. It lets the form ask
// for the SAME passphrase on return instead of inviting a new one — nothing
// about the passphrase itself is stored, so D-023 still holds.
const passphraseMarkerKey = (network: string, address: string) =>
  `tacitpay.private-state-set.v1:${network}:${address}`;
/** The ISO timestamp of the first successful unlock, or null if never set. */
const passphraseSetAt = (network: string, address: string | undefined) => {
  if (!address) return null;
  try {
    return localStorage.getItem(passphraseMarkerKey(network, address));
  } catch {
    return null;
  }
};
const markPassphraseSet = (network: string, address: string) => {
  try {
    localStorage.setItem(passphraseMarkerKey(network, address), new Date().toISOString());
  } catch {
    // A missing breadcrumb only costs the returning-user wording.
  }
};

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
  const { connection } = useProving();
  // Setting or asking again? The records are per-wallet, so the breadcrumb is
  // too — and it carries WHEN, which makes "you already set one" concrete.
  const setAtRaw = passphraseSetAt(network, connection?.address);
  const returning = setAtRaw !== null;
  const setAtDate = setAtRaw ? new Date(setAtRaw) : null;
  const setAtLabel =
    setAtDate && !Number.isNaN(setAtDate.getTime())
      ? setAtDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : null;
  // Prefilled from whatever is actually in effect — a stored address or one baked in at
  // build time. Showing an empty box while the app reads a real chain is a lie.
  const [address, setAddress] = useState(() => getContractAddress(network) ?? '');
  const [confirmForget, setConfirmForget] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [touched, setTouched] = useState(false);

  // The address is PER-NETWORK state behind a single mounted field: re-seed it
  // whenever the network flips, or the input goes on showing the previous
  // network's address over this one's stored value — which reads as the save
  // having landed in the wrong slot.
  useEffect(() => {
    setAddress(getContractAddress(network) ?? '');
    setTouched(false);
  }, [network]);
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

  // Forgetting disconnects and clears — one accidental click cost the owner
  // his address once, so the button only ASKS now; the dialog below does it.
  const forget = () => {
    clearStoredContractAddress(network);
    setAddress('');
    disconnect();
    setConfirmForget(false);
    toast.info('Contract address cleared');
  };

  const onConnect = async (event: FormEvent) => {
    event.preventDefault();
    if (passphrase.length === 0) return;
    try {
      await connect(passphrase);
      // The passphrase is held only by the provider that derives the storage key from it.
      setPassphrase('');
      if (connection) markPassphraseSet(network, connection.address);
      toast.success('Connected to the contract');
    } catch (error) {
      toast.error(getErrorMessage(error));
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
              long before anyone connects a wallet — saying "Mock data" then is wrong.
              Until the contract itself is connected, the sandbox's amber sits
              beside it: same caution register as the banner, so "reads work"
              can never be mistaken for "connected". */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!live ? (
              <Badge
                variant="outline"
                className="border-dashed border-[var(--sandbox-border)] bg-[var(--sandbox-bg)] text-[var(--sandbox-fg)]"
              >
                Not connected
              </Badge>
            ) : null}
            <Badge variant={live || observer ? 'default' : 'secondary'}>
              {live ? 'Live' : observer ? 'Public reads live' : 'Mock data'}
            </Badge>
          </div>
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
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmForget(true)}
              >
                Clear
              </Button>
            ) : null}
            <Dialog open={confirmForget} onOpenChange={setConfirmForget}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Clear this contract address?</DialogTitle>
                  <DialogDescription>
                    Removes the address saved for {network} from this browser and disconnects
                    anything live. If the bundle carries a default for this network, the field falls
                    back to it.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setConfirmForget(false)}>
                    Cancel
                  </Button>
                  <Button type="button" variant="destructive" onClick={forget}>
                    Clear address
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
              ) : network === 'local' ? (
                // The seed hint is the local devnet's own instruction — on
                // preview it is developer jargon in front of a judge, so
                // preview keeps only the storage fact.
                <>
                  <code className="font-mono text-xs">yarn demo:seed</code> prints one for a local
                  devnet. Saved per network, in this browser only.
                </>
              ) : (
                <>Saved per network, in this browser only.</>
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
          // The whole unlock step wears the sandbox's amber while the
          // contract is not connected: this form is the one door out of the
          // sandbox, so the caution colour points straight at the exit.
          <form
            className="space-y-3 rounded-lg border border-dashed border-[var(--sandbox-border)] bg-[var(--sandbox-bg)] p-4"
            onSubmit={onConnect}
          >
            <p className="text-sm font-medium text-[var(--sandbox-fg)]">
              {returning
                ? `Still in the sandbox — unlock your records to go live on ${network}.`
                : `Still in the sandbox — connect to the contract to go live on ${network}.`}
            </p>
            <div className="space-y-2">
              <Label htmlFor="private-state-passphrase">
                {returning
                  ? 'Enter your private-state passphrase'
                  : 'Set a private-state passphrase'}
              </Label>
              {/* Setting and asking-again are different sentences: the first
                  visit chooses the passphrase, every return must repeat it.
                  Showing "choose one you will remember" to someone who already
                  chose reads as an invitation to type a new one — which cannot
                  open their records. */}
              <Input
                id="private-state-passphrase"
                type="password"
                autoComplete={returning ? 'current-password' : 'new-password'}
                placeholder={
                  returning
                    ? 'The passphrase you set on this device'
                    : 'Set a passphrase for this device'
                }
                value={passphrase}
                disabled={blocker !== null || connecting}
                onChange={(event) => setPassphrase(event.target.value)}
              />
              {returning ? (
                // Two lines on purpose: the FACT (you set one, and when) gets
                // its own weighted line, the instruction sits under it.
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-medium">
                    You set this wallet&rsquo;s passphrase on this device
                    {setAtLabel ? ` on ${setAtLabel}` : ' before'}.
                  </p>
                  <p>
                    Enter that same one — a different passphrase cannot open these records, and it
                    cannot be recovered.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  First connection on this device sets it. It encrypts invoice bodies, salts and
                  memos in this browser, is never sent anywhere, and cannot be recovered — choose
                  one you will remember.
                </p>
              )}
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
              {connecting
                ? 'Connecting…'
                : returning
                  ? 'Unlock and connect'
                  : 'Set passphrase and connect'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
