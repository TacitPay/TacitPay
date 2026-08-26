import {
  CloudConnection,
  Danger,
  Export,
  ExportSquare,
  Import,
  Refresh,
  ShieldTick,
  TickCircle,
  Wallet3,
} from 'iconsax-reactjs';
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { LiveConnectionCard } from '@/components/LiveConnectionCard';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type InvoiceNetwork, useTacitPay } from '@/lib/api';
import {
  checkProverHealth,
  getProvingDisplayLabel,
  hasWalletProvingProvider,
  LOCAL_PROVER_URL,
  type ProverHealth,
  type ProvingPreference,
  PROVING_TIER_EXPLANATIONS,
  validateCustomProverUrl,
} from '@/lib/proving';
import { useProving } from '@/lib/proving-context';
import { cn } from '@/lib/utils';

type LiveHealth = { status: 'checking'; detail: string } | Pick<ProverHealth, 'status' | 'detail'>;

function useLiveProverHealth(url: string, unavailableDetail: string) {
  const [attempt, setAttempt] = useState(0);
  const [health, setHealth] = useState<LiveHealth>({
    status: url ? 'checking' : 'unreachable',
    detail: url ? 'Checking availability…' : unavailableDetail,
  });

  useEffect(() => {
    let ignore = false;
    if (!url) {
      setHealth({ status: 'unreachable', detail: unavailableDetail });
      return () => {
        ignore = true;
      };
    }

    setHealth({ status: 'checking', detail: 'Checking availability…' });
    void checkProverHealth(url).then((result) => {
      if (!ignore) setHealth({ status: result.status, detail: result.detail });
    });
    return () => {
      // A newer URL or retry owns the visible result.
      ignore = true;
    };
  }, [attempt, unavailableDetail, url]);

  const refresh = useCallback(() => setAttempt((current) => current + 1), []);
  return { health, refresh };
}

function HealthBadge({ status }: { status: LiveHealth['status'] }) {
  if (status === 'checking') {
    return (
      <Badge variant="secondary">
        <Refresh
          size={14}
          variant="Linear"
          className="motion-safe:animate-spin"
          aria-hidden="true"
        />
        Checking
      </Badge>
    );
  }
  if (status === 'available') {
    return (
      <Badge className="bg-[var(--status-paid-bg)] text-[var(--status-paid-fg)]">
        <TickCircle size={14} variant="Bold" aria-hidden="true" />
        Available
      </Badge>
    );
  }
  return (
    <Badge className="bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled-fg)]">
      <Danger size={14} variant="Linear" aria-hidden="true" />
      Unreachable
    </Badge>
  );
}

function NetworkChoice({
  value,
  selected,
  title,
  description,
  onSelect,
}: {
  value: InvoiceNetwork;
  selected: boolean;
  title: string;
  description: string;
  onSelect(value: InvoiceNetwork): void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(value)}
      className={`min-h-24 rounded-lg border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none ${
        selected ? 'border-primary bg-accent' : 'bg-background hover:bg-muted/60'
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="font-medium">{title}</span>
        {selected ? <TickCircle size={19} variant="Bold" aria-hidden="true" /> : null}
      </span>
      <span className="mt-1 block text-sm leading-6 text-muted-foreground">{description}</span>
    </button>
  );
}

function ProvingChoice({
  value,
  selected,
  title,
  description,
  meta,
  onSelect,
}: {
  value: ProvingPreference;
  selected: boolean;
  title: string;
  description: string;
  meta?: ReactNode;
  onSelect(value: ProvingPreference): void;
}) {
  return (
    <label className="block cursor-pointer">
      <input
        type="radio"
        name="proving-preference"
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
        className="peer sr-only"
      />
      <span
        className={cn(
          'flex min-h-28 flex-col rounded-lg border p-4 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
          selected ? 'border-primary bg-accent' : 'bg-background hover:bg-muted/60',
        )}
      >
        <span className="flex items-start justify-between gap-3">
          <span className="font-medium">{title}</span>
          {selected ? <TickCircle size={19} variant="Bold" aria-hidden="true" /> : meta}
        </span>
        <span className="mt-2 block text-sm leading-6 text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function EffectiveTierCard() {
  const { preference, resolution, resolving } = useProving();
  const label = resolving ? 'Checking…' : getProvingDisplayLabel(resolution);

  return (
    <Card className="border-primary/35 bg-accent/35">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ShieldTick size={20} variant="Linear" aria-hidden="true" />
            </span>
            <div>
              <CardDescription>Currently effective</CardDescription>
              <CardTitle className="mt-1">Proving: {label}</CardTitle>
            </div>
          </div>
          {resolving ? (
            <HealthBadge status="checking" />
          ) : resolution?.effectiveTier ? (
            <HealthBadge status="available" />
          ) : (
            <HealthBadge status="unreachable" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">
          {resolving ? 'Checking the selected proving path…' : resolution?.reason}
        </p>
        {!resolving && resolution?.effectiveTier && resolution.preferredUnavailable ? (
          <p className="rounded-md border bg-background/70 p-3 text-sm leading-6">
            {preference === 'auto'
              ? 'Auto fell back from in-wallet proving'
              : 'Your selected mode was unavailable'}
            : {resolution.preferredUnavailableReason}
          </p>
        ) : null}
        <Separator />
        <p className="text-sm leading-6 text-muted-foreground">
          Whoever generates a proof necessarily sees the invoice amount, memo, and keys. This
          setting lets you choose where that happens.
        </p>
      </CardContent>
    </Card>
  );
}

function LocalProverCard({ health, onRefresh }: { health: LiveHealth; onRefresh(): void }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Local proof server</CardTitle>
            <CardDescription className="mt-2 font-mono">{LOCAL_PROVER_URL}</CardDescription>
          </div>
          <HealthBadge status={health.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">{health.detail}</p>
        {health.status === 'unreachable' ? (
          <div className="rounded-md border bg-muted/35 p-4 text-sm leading-6">
            Run the <code className="font-mono">midnightntwrk/proof-server</code> Docker image on
            port <code className="font-mono">6300</code>, which must not be changed, or switch to a
            wallet that proves in-browser.
            <Button asChild variant="link" size="sm" className="mt-2 flex w-fit px-0">
              <a
                href="https://docs.midnight.network/guides/run-proof-server"
                target="_blank"
                rel="noreferrer"
              >
                <ExportSquare size={16} variant="Linear" aria-hidden="true" />
                Run the proof server
              </a>
            </Button>
          </div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={health.status === 'checking'}
          aria-busy={health.status === 'checking'}
          onClick={onRefresh}
        >
          <Refresh size={16} variant="Linear" aria-hidden="true" />
          Check again
        </Button>
      </CardContent>
    </Card>
  );
}

function CustomProverCard() {
  const { customUrl, setCustomUrl, clearCustomUrl } = useProving();
  const [draft, setDraft] = useState(customUrl);
  const [touched, setTouched] = useState(false);
  const validation = validateCustomProverUrl(draft);
  const healthUrl = validation.valid ? validation.url : '';
  const { health, refresh } = useLiveProverHealth(
    healthUrl,
    draft.trim() ? 'Enter a valid prover URL to check it.' : 'No custom prover is configured.',
  );
  const showError = touched && !validation.valid;

  useEffect(() => setDraft(customUrl), [customUrl]);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    const result = setCustomUrl(draft);
    if (!result.valid) return;
    setDraft(result.url);
    toast.success('Your prover server was saved');
  }

  function remove() {
    clearCustomUrl();
    setDraft('');
    setTouched(false);
    toast.success('Your prover server was removed');
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Your own proof server</CardTitle>
            <CardDescription className="mt-2">
              Use only a server you control. TacitPay does not operate a prover.
            </CardDescription>
          </div>
          <HealthBadge status={health.status} />
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="custom-prover-url">Prover base URL</Label>
            <Input
              id="custom-prover-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              placeholder="https://prover.example.com"
              value={draft}
              onBlur={() => setTouched(true)}
              onChange={(event) => {
                setDraft(event.target.value);
                setTouched(false);
              }}
              aria-invalid={showError || undefined}
              aria-describedby={showError ? 'custom-prover-error' : 'custom-prover-help'}
            />
            {showError ? (
              <p id="custom-prover-error" className="text-xs text-destructive">
                {validation.error}
              </p>
            ) : (
              <p id="custom-prover-help" className="text-xs text-muted-foreground">
                HTTPS is required. HTTP is allowed only for localhost or 127.0.0.1.
              </p>
            )}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{health.detail}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={!validation.valid}>
              Save server
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!validation.valid || health.status === 'checking'}
              aria-busy={health.status === 'checking'}
              onClick={refresh}
            >
              <Refresh size={16} variant="Linear" aria-hidden="true" />
              Check again
            </Button>
            {customUrl ? (
              <Button type="button" variant="ghost" size="sm" onClick={remove}>
                Remove
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ProvingSettings() {
  const { connection, preference, setPreference } = useProving();
  const local = useLiveProverHealth(LOCAL_PROVER_URL, 'The local prover is unreachable.');
  const walletAvailable = hasWalletProvingProvider(connection);

  return (
    <div className="space-y-6">
      <EffectiveTierCard />

      <Card>
        <CardHeader>
          <CardTitle>Proving mode</CardTitle>
          <CardDescription>
            Choose where private invoice data is used to generate proofs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <fieldset className="grid gap-3 md:grid-cols-2">
            <legend className="sr-only">Proving mode</legend>
            <ProvingChoice
              value="auto"
              selected={preference === 'auto'}
              title="Auto (recommended)"
              description="Uses the most private available option: wallet, then local server, then your own server."
              onSelect={setPreference}
            />
            <ProvingChoice
              value="wallet"
              selected={preference === 'wallet'}
              title="In wallet"
              description={PROVING_TIER_EXPLANATIONS.wallet}
              meta={
                connection ? (
                  <Badge variant={walletAvailable ? 'secondary' : 'outline'}>
                    {walletAvailable ? 'Available' : 'Unavailable'}
                  </Badge>
                ) : (
                  <Wallet3 size={18} variant="Linear" aria-hidden="true" />
                )
              }
              onSelect={setPreference}
            />
            <ProvingChoice
              value="local"
              selected={preference === 'local'}
              title="Local server"
              description={PROVING_TIER_EXPLANATIONS.local}
              meta={<HealthBadge status={local.health.status} />}
              onSelect={setPreference}
            />
            <ProvingChoice
              value="custom"
              selected={preference === 'custom'}
              title="Your own server"
              description={PROVING_TIER_EXPLANATIONS.custom}
              onSelect={setPreference}
            />
          </fieldset>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <LocalProverCard health={local.health} onRefresh={local.refresh} />
        <CustomProverCard />
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { network, setNetwork } = useTacitPay();

  function comingSoon() {
    toast.info('Coming with wallet integration');
  }

  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Choose the network and where private proofs are generated."
      />

      <Tabs defaultValue="network" className="space-y-5">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="network">Network &amp; proof</TabsTrigger>
          <TabsTrigger value="private-state">Private state</TabsTrigger>
        </TabsList>

        <TabsContent value="network" className="space-y-6">
          <LiveConnectionCard />

          <Card>
            <CardHeader>
              <CardTitle>Network display</CardTitle>
              <CardDescription>
                This selector changes the visible demo network. It does not switch a chain provider.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">Network</legend>
                <NetworkChoice
                  value="preview"
                  selected={network === 'preview'}
                  title="Preview"
                  description="Midnight Preview network for judge demos."
                  onSelect={setNetwork}
                />
                <NetworkChoice
                  value="local"
                  selected={network === 'local'}
                  title="Local"
                  description="Local development display using the undeployed wallet network ID."
                  onSelect={setNetwork}
                />
              </fieldset>
            </CardContent>
          </Card>

          <ProvingSettings />
        </TabsContent>

        <TabsContent value="private-state">
          <Card>
            <CardHeader>
              <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <CloudConnection size={22} variant="Linear" aria-hidden="true" />
              </div>
              <CardTitle>Private state backup</CardTitle>
              <CardDescription>
                Export or restore encrypted invoice and receipt state when wallet-backed storage
                lands.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Separator />
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" onClick={comingSoon}>
                  <Export size={17} variant="Linear" aria-hidden="true" />
                  Export private state
                </Button>
                <Button type="button" variant="outline" onClick={comingSoon}>
                  <Import size={17} variant="Linear" aria-hidden="true" />
                  Import private state
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Coming with wallet integration. No private data leaves this browser in the mock
                shell.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
