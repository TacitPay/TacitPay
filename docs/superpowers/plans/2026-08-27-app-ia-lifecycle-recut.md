# App IA Lifecycle Re-cut — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-cut the app's navigation from roles (Merchant / Receipts / Verify) to the invoice's lifecycle (Invoices / Payments / Verification / Settings), with a real invoice-detail screen and a two-state home.

**Architecture:** Pure UI re-cut inside `packages/ui` — new pages composed from the existing API surface (`listMyInvoices`, `listMyReceipts`, `getInvoiceStatus`), client-side redirects for the old routes, and the frozen URLs (`/pay#…`, `/verify/:id`) untouched. No new dependencies, no new API methods, no contract/CLI changes.

**Tech Stack:** React 19 + react-router-dom, Tailwind, shadcn/ui primitives already in the repo, iconsax-reactjs icons.

**Spec:** `docs/superpowers/specs/2026-08-27-app-ia-lifecycle-recut-design.md`

## Global Constraints

- **NO git commits or pushes.** Marcus commits on his word only. Every task's cycle ends at a passing gate, not a commit.
- **Frozen URLs:** `/pay#<payload>` and `/verify/:invoiceId` are renamed by nobody, ever. `packages/cli/src/local.ts` is not touched.
- **No unit-test rig is added.** The gate per task is `yarn workspace @tacitpay/ui run typecheck`; the plan ends with full workspace gates (typecheck, lint, format, build) plus a scripted browser pass.
- **Empty-with-a-reason beats decorative:** disconnected visitors never see skeletons or fake numbers; skeletons render only while a real fetch is in flight.
- **Comment voice:** match the repo's explanatory comment style (see `App.tsx`, `AppShell.tsx`) — comments state constraints and reasons, not narration.
- **Surgical scope:** `PayPage`, `VerifyPage`, `SettingsPage`, `NotFoundPage`, all of `marketing/`, contracts, CLI, and docs beyond `guides/app.md:17` are untouched.
- **Vocabulary:** "merchant" and "payer" survive as role words in copy; only the nav stops using them as place names.
- Uncommitted work already in the tree (`AppShell.tsx` icon nav, `WalletButton.tsx`, the spec) is built upon, not reverted.

---

### Task 1: VerificationPage + `/verification` route

**Files:**

- Create: `packages/ui/src/pages/VerificationPage.tsx`
- Modify: `packages/ui/src/App.tsx` (add lazy import + route)

**Interfaces:**

- Consumes: `PageHeader`, `ui/{button,card,input,label}`, `useNavigate`.
- Produces: route `/verification` — Tasks 5 and 6 link to it.

- [ ] **Step 1: Write `VerificationPage.tsx`**

```tsx
import { Verify } from 'iconsax-reactjs';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// The truth gate as a place of its own. The whitepaper's claim — anyone can
// check an invoice with no wallet, no account, no permission — deserves a page
// rather than a form squatting on the home screen: the nav can point somewhere
// real, and /verify/:id gets a front door for whoever arrives holding an ID
// instead of a link. Deliberately wallet-free: nothing here reads private
// state, so nothing here may ask for a connection.

export function VerificationPage() {
  const navigate = useNavigate();
  const [invoiceId, setInvoiceId] = useState('');
  const [error, setError] = useState<string | null>(null);

  function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = invoiceId.trim();
    if (!/^[0-9a-f]{64}$/iu.test(value)) {
      setError('Enter a 64-character hexadecimal invoice ID.');
      return;
    }
    setError(null);
    navigate(`/verify/${value.toLowerCase()}`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Public verification"
        title="Verify an invoice"
        description="Check any invoice's settlement status straight from the public ledger. No wallet, no account, no permission."
      />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Look up an invoice</CardTitle>
          <CardDescription>
            The ID is the invoice's public commitment — ask the merchant for it, or copy it from a
            receipt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={verify} className="space-y-3" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="invoice-id">Invoice ID</Label>
              <Input
                id="invoice-id"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="64-character hex ID"
                value={invoiceId}
                onChange={(event) => setInvoiceId(event.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'invoice-id-error' : undefined}
                className="font-mono"
              />
              {error ? (
                <p id="invoice-id-error" role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </div>
            <Button type="submit" disabled={!invoiceId.trim()}>
              <Verify size={17} variant="Linear" aria-hidden="true" />
              Verify on chain
            </Button>
          </form>
        </CardContent>
      </Card>
      {/* What the reader learns and — as importantly — what they cannot: the
          claim is only credible with its limit stated beside it. */}
      <p className="mt-6 max-w-xl text-sm leading-6 text-muted-foreground">
        Verification reads only the public record: whether the invoice exists, whether it is paid,
        and when it expires. The amount, the memo, and both parties stay private.
      </p>
    </>
  );
}
```

- [ ] **Step 2: Register the route in `App.tsx`**

Add with the other lazy imports (alphabetical position after `SettingsPage`):

```tsx
const VerificationPage = lazy(async () => ({
  default: (await import('@/pages/VerificationPage')).VerificationPage,
}));
```

Add inside the `<Route element={<AppLayout />}>` block, after the `/verify/:invoiceId` route:

```tsx
<Route path="/verification" element={<VerificationPage />} />
```

- [ ] **Step 3: Gate** — `yarn workspace @tacitpay/ui run typecheck` → PASS.

---

### Task 2: InvoicesPage replaces MerchantPage; `/merchant` becomes a redirect

**Files:**

- Create: `packages/ui/src/pages/InvoicesPage.tsx`
- Delete: `packages/ui/src/pages/MerchantPage.tsx`
- Modify: `packages/ui/src/App.tsx` (swap lazy import; `/invoices` route; `/merchant` → `Navigate`)

**Interfaces:**

- Consumes: everything `MerchantPage` consumed, minus the per-row action machinery (moves to Task 3).
- Produces: route `/invoices`; rows navigate to `/invoices/${invoice.invoiceId}` (Task 3's route). Dialog component `NewInvoiceDialog` stays private to this file.

- [ ] **Step 1: Write `InvoicesPage.tsx`**

Start from `MerchantPage.tsx` and apply these changes (the file keeps `NewInvoiceDialog` verbatim — same imports, same body):

1. Rename `MerchantPage` → `InvoicesPage`, `MerchantDashboard` → `InvoicesList`.
2. **Header moves outside the gate** (wallet policy: the section explains itself without a wallet). Dialog state lifts to the page so the header button can own it:

```tsx
export function InvoicesPage() {
  const { connection } = useProving();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      {/* The header stands outside the gate: a visitor without a wallet still
          learns what this section is. The action only appears once a wallet
          is here to act with — a dead button is worse than none. */}
      <PageHeader
        eyebrow="Invoice"
        title="Your invoices"
        description="Create private payment requests and follow their public settlement status."
        action={
          connection ? (
            <Button type="button" onClick={() => setDialogOpen(true)}>
              <Add size={18} variant="Linear" aria-hidden="true" />
              New invoice
            </Button>
          ) : undefined
        }
      />
      <SandboxBanner />
      <WalletGate
        title="Connect a merchant wallet"
        description="Your wallet unlocks the invoice records kept in private state."
      >
        {() => <InvoicesList dialogOpen={dialogOpen} onDialogOpenChange={setDialogOpen} />}
      </WalletGate>
    </>
  );
}
```

3. `InvoicesList({ dialogOpen, onDialogOpenChange }: { dialogOpen: boolean; onDialogOpenChange(open: boolean): void })` keeps: `loadInvoices`, the `NewInvoiceDialog` (fed the lifted props), `ProvingUnavailableNotice` (creation also proves), load error / skeleton / empty states. The `PageHeader` and `SandboxBanner` are REMOVED from it (now outside), and the whole `act()` machinery goes — `actionInvoiceId`, `actionError`, `actionSuccess`, the withdraw/cancel buttons, `ProofStepper` at list level, `CopyButton` per row, `TransactionSuccess` (all of it reappears on the detail page, Task 3). The `EmptyState` action button calls `onDialogOpenChange(true)`.
4. **Rows navigate to the detail route.** Table columns become `Status | Amount | Memo | Created | Expires` plus a trailing chevron cell:

```tsx
const navigate = useNavigate();
// …
{
  invoices.map((invoice) => (
    <TableRow
      key={invoice.invoiceId}
      // The row is the link: every cell leads to the same detail, and the
      // actions that used to crowd this table now live where they have room.
      className="cursor-pointer"
      onClick={() => navigate(`/invoices/${invoice.invoiceId}`)}
    >
      <TableCell>
        <StatusBadge status={invoice.status} />
      </TableCell>
      <TableCell>
        <PrivateAmount amount={invoice.amount} token={invoice.token} />
      </TableCell>
      <TableCell className="max-w-64 whitespace-normal">
        <p className="font-medium">{invoice.memo}</p>
        <code className="font-mono text-xs text-muted-foreground">
          {invoice.invoiceId.slice(0, 10)}…
        </code>
      </TableCell>
      <TableCell className="text-muted-foreground">{formatDateTime(invoice.createdAt)}</TableCell>
      <TableCell className="text-muted-foreground">{formatDateTime(invoice.expiresAt)}</TableCell>
      <TableCell>
        <div className="flex justify-end">
          <Link
            to={`/invoices/${invoice.invoiceId}`}
            aria-label={`Open invoice ${invoice.memo}`}
            onClick={(event) => event.stopPropagation()}
            className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowRight2 size={16} variant="Linear" aria-hidden="true" />
          </Link>
        </div>
      </TableCell>
    </TableRow>
  ));
}
```

Imports change accordingly: add `useNavigate`, `Link`, `ArrowRight2`; drop `DirectboxSend`, `CopyButton`, `ProofStepper` at list level, `TransactionSuccess`, `useProving`'s `refreshProving` (keep `resolution`, `resolving` for the notice). `Table` min-width drops to `min-w-[840px]`.

- [ ] **Step 2: Rewire `App.tsx`**

Replace the `MerchantPage` lazy import with `InvoicesPage`; replace the route:

```tsx
<Route path="/invoices" element={<InvoicesPage />} />;
{
  /* The old role-named door. Bookmarks and muscle memory land here for a
    while yet; the redirect keeps every one of them working. */
}
<Route path="/merchant" element={<Navigate to="/invoices" replace />} />;
```

- [ ] **Step 3: Delete `MerchantPage.tsx`** — `rm packages/ui/src/pages/MerchantPage.tsx`.

- [ ] **Step 4: Gate** — `yarn workspace @tacitpay/ui run typecheck` → PASS. (`AppHomePage` still links `/merchant`; the redirect covers it until Task 5.)

---

### Task 3: InvoiceDetailPage at `/invoices/:invoiceId`

**Files:**

- Create: `packages/ui/src/pages/InvoiceDetailPage.tsx`
- Modify: `packages/ui/src/App.tsx` (lazy import + route above `/merchant` redirect)

**Interfaces:**

- Consumes: `api.listMyInvoices()`, `api.getInvoiceStatus(id)` → `{ status, expiresAt, exists, paidPool }`, `api.withdraw(id)`, `api.cancelInvoice(id)`, `useProving().{resolution,resolving,refreshProving}`, `DetailSkeleton`, `EmptyState`, `ErrorState`, `StatusBadge`, `PrivateAmount`, `CopyButton`, `ProofStepper`, `ProvingUnavailableNotice`, `TransactionSuccess`, `formatDateTime`, `truncateHash`, `getErrorMessage`.
- Produces: the actions surface Task 2 removed from the index.

- [ ] **Step 1: Write `InvoiceDetailPage.tsx`**

```tsx
import { ArrowLeft2, DirectboxSend, Verify } from 'iconsax-reactjs';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { CopyButton } from '@/components/CopyButton';
import { DetailSkeleton, EmptyState, ErrorState } from '@/components/DataStates';
import { PageHeader } from '@/components/PageHeader';
import { SandboxBanner } from '@/components/SandboxBanner';
import { PrivateAmount } from '@/components/PrivateAmount';
import { ProofStepper } from '@/components/ProofStepper';
import { ProvingUnavailableNotice } from '@/components/ProvingUnavailableNotice';
import { StatusBadge } from '@/components/StatusBadge';
import { TransactionSuccess } from '@/components/TransactionSuccess';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { WalletGate } from '@/components/WalletGate';
import { type InvoiceView, useTacitPay } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { formatDateTime, truncateHash } from '@/lib/format';
import { useProving } from '@/lib/proving-context';

// One invoice, both halves of it: the private record this wallet holds beside
// the public status the chain shows. This page IS the product's argument laid
// flat — everything in the left card never left this machine; everything in
// the right card is what an outsider at /verify/:id can see. The withdraw and
// cancel actions moved here from the index table because settling an invoice
// deserves the whole record in view, not a button squeezed into a row.

type PublicStatus = Awaited<ReturnType<ReturnType<typeof useTacitPay>['api']['getInvoiceStatus']>>;

const INVOICE_ID_PATTERN = /^[0-9a-f]{64}$/iu;

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <p className="shrink-0 text-muted-foreground">{label}</p>
      <div className="min-w-0 text-right font-medium">{children}</div>
    </div>
  );
}

function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const { api, proofStage } = useTacitPay();
  const { resolution, resolving, refreshProving } = useProving();
  const [invoice, setInvoice] = useState<InvoiceView | null | undefined>(undefined);
  const [publicStatus, setPublicStatus] = useState<PublicStatus | null>(null);
  const [publicError, setPublicError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<{ txId: string; title: string } | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    setPublicError(null);
    // Two independent halves: the private record from this wallet's state and
    // the public status from the chain. allSettled, so losing one does not
    // blank the other — that asymmetry is the whole point of the page.
    const [mine, chain] = await Promise.allSettled([
      api.listMyInvoices(),
      api.getInvoiceStatus(invoiceId),
    ]);
    if (mine.status === 'fulfilled') {
      setInvoice(mine.value.find((entry) => entry.invoiceId === invoiceId) ?? null);
    } else {
      setInvoice(undefined);
      setLoadError(getErrorMessage(mine.reason));
    }
    if (chain.status === 'fulfilled') setPublicStatus(chain.value);
    else setPublicError(getErrorMessage(chain.reason));
  }, [api, invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: 'withdraw' | 'cancel') {
    setActing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const currentProving = await refreshProving();
      if (!currentProving.effectiveTier) return;
      const result =
        action === 'withdraw' ? await api.withdraw(invoiceId) : await api.cancelInvoice(invoiceId);
      setActionSuccess({
        txId: result.txId,
        title: action === 'withdraw' ? 'Funds withdrawn' : 'Invoice cancelled',
      });
      await load();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setActing(false);
    }
  }

  if (loadError) return <ErrorState message={loadError} onRetry={() => void load()} />;
  if (invoice === undefined) return <DetailSkeleton />;
  if (invoice === null) {
    return (
      <EmptyState
        title="Not in this wallet's private state"
        description="This wallet holds no record of that invoice ID. If it belongs to someone else, its public status is still anyone's to check."
        action={
          <Button asChild variant="outline">
            <Link to={`/verify/${invoiceId}`}>
              <Verify size={16} variant="Linear" aria-hidden="true" />
              Check the public status
            </Link>
          </Button>
        }
      />
    );
  }

  const actionable = !acting && !resolving && Boolean(resolution?.effectiveTier);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Invoice"
        title={invoice.memo}
        description={`Created ${formatDateTime(invoice.createdAt)} · ID ${truncateHash(invoice.invoiceId)}`}
        action={
          <div className="flex flex-wrap gap-2">
            {invoice.status === 'PAID' ? (
              <Button type="button" disabled={!actionable} onClick={() => void act('withdraw')}>
                <DirectboxSend size={17} variant="Linear" aria-hidden="true" />
                Withdraw
              </Button>
            ) : null}
            {invoice.status === 'OPEN' ? (
              <Button
                type="button"
                variant="outline"
                disabled={!actionable}
                onClick={() => void act('cancel')}
              >
                Cancel invoice
              </Button>
            ) : null}
          </div>
        }
      />
      <SandboxBanner />

      {acting && proofStage ? <ProofStepper stage={proofStage} /> : null}
      {!resolving && !resolution?.effectiveTier ? (
        <ProvingUnavailableNotice reason={resolution?.reason} />
      ) : null}
      {actionError ? (
        <ErrorState message={actionError} title="The invoice action did not complete" />
      ) : null}
      {actionSuccess ? (
        <TransactionSuccess txId={actionSuccess.txId} title={actionSuccess.title} />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Private record</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Amount">
              <PrivateAmount amount={invoice.amount} token={invoice.token} />
            </DetailRow>
            <DetailRow label="Memo">{invoice.memo}</DetailRow>
            <DetailRow label="Created">{formatDateTime(invoice.createdAt)}</DetailRow>
            <DetailRow label="Expires">{formatDateTime(invoice.expiresAt)}</DetailRow>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Private payment link</p>
              <div className="max-h-24 overflow-y-auto rounded-md border bg-muted/40 p-2.5 font-mono text-xs leading-5 break-all">
                {invoice.link}
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyButton value={invoice.link} label="Copy link" />
                <CopyButton value={invoice.invoiceId} label="Copy invoice ID" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Public status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {publicError ? (
              <ErrorState
                message={publicError}
                title="Could not read the chain"
                onRetry={() => void load()}
              />
            ) : publicStatus ? (
              <>
                <DetailRow label="Status">
                  <StatusBadge status={publicStatus.status} />
                </DetailRow>
                <DetailRow label="On chain">
                  {publicStatus.exists ? 'Committed' : 'Not found'}
                </DetailRow>
                <DetailRow label="Expires">{formatDateTime(publicStatus.expiresAt)}</DetailRow>
                {publicStatus.paidPool ? (
                  <DetailRow label="Settled via">
                    {publicStatus.paidPool === 'shielded' ? 'Shielded pool' : 'Unshielded pool'}
                  </DetailRow>
                ) : null}
                <Separator />
                <p className="text-sm leading-6 text-muted-foreground">
                  Everything in this card is what an outsider can see — and nothing more. The
                  amount, the memo, and both parties stay in the private record.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/verify/${invoice.invoiceId}`}>
                    <Verify size={16} variant="Linear" aria-hidden="true" />
                    Open public verification
                  </Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Reading the chain…</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const normalizedId = invoiceId?.trim().toLowerCase() ?? '';

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground">
        <Link to="/invoices">
          <ArrowLeft2 size={16} variant="Linear" aria-hidden="true" />
          All invoices
        </Link>
      </Button>
      {INVOICE_ID_PATTERN.test(normalizedId) ? (
        <WalletGate
          title="Connect a merchant wallet"
          description="This invoice's private record lives in your wallet's state; connect to open it."
        >
          {() => <InvoiceDetail invoiceId={normalizedId} />}
        </WalletGate>
      ) : (
        <EmptyState
          title="That is not an invoice ID"
          description="Invoice IDs are 64 hexadecimal characters. Check the link that brought you here."
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Register in `App.tsx`** — lazy import `InvoiceDetailPage`; route BEFORE the `/merchant` redirect:

```tsx
<Route path="/invoices/:invoiceId" element={<InvoiceDetailPage />} />
```

- [ ] **Step 3: Gate** — `yarn workspace @tacitpay/ui run typecheck` → PASS.

---

### Task 4: PaymentsPage replaces ReceiptsPage; `/receipts` becomes a redirect

**Files:**

- Create: `packages/ui/src/pages/PaymentsPage.tsx`
- Delete: `packages/ui/src/pages/ReceiptsPage.tsx`
- Modify: `packages/ui/src/App.tsx` (swap lazy import; `/payments` route; `/receipts` → `Navigate`)

**Interfaces:**

- Consumes: `api.decodeLink(value)` (throws on invalid), `api.listMyReceipts()`, plus everything `ReceiptsPage` consumed.
- Produces: route `/payments`. The paste-form card (`OpenInvoiceCard`) stays private to this file; Task 5's chooser keeps its own copy of the same form.

- [ ] **Step 1: Write `PaymentsPage.tsx`**

```tsx
import { Link21, ReceiptText, Verify } from 'iconsax-reactjs';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { EmptyState, ErrorState, TableSkeleton } from '@/components/DataStates';
import { PageHeader } from '@/components/PageHeader';
import { SandboxBanner } from '@/components/SandboxBanner';
import { PrivateAmount } from '@/components/PrivateAmount';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { WalletGate } from '@/components/WalletGate';
import { type InvoiceStatus, type ReceiptView, useTacitPay } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

// The payer's whole side of the lifecycle in one place: open a link to pay,
// and beneath it the receipts of everything already settled. "Where is pay?"
// was the question that forced the re-cut — this page is the answer. The
// /pay#<payload> URL itself is frozen (the CLI emits it, sent links carry it);
// this page is the door that leads there, never a replacement for it.

function OpenInvoiceCard() {
  const { api } = useTacitPay();
  const navigate = useNavigate();
  const [invoiceLink, setInvoiceLink] = useState('');
  const [error, setError] = useState<string | null>(null);

  function open(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = invoiceLink.trim();
    try {
      api.decodeLink(value);
      const hashIndex = value.indexOf('#');
      const fragment = hashIndex >= 0 ? value.slice(hashIndex + 1) : value;
      setError(null);
      navigate(`/pay#${fragment}`);
    } catch (decodeError) {
      setError(
        decodeError instanceof Error ? decodeError.message : 'This invoice link is not valid.',
      );
    }
  }

  return (
    // Deliberately OUTSIDE the wallet gate: opening a link only decodes what
    // is already in your hands. You see what you are being asked to pay
    // before any wallet enters the room — the opposite order is how phishing
    // behaves.
    <Card className="max-w-xl">
      <CardHeader>
        <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Link21 size={20} variant="Linear" aria-hidden="true" />
        </div>
        <CardTitle>Pay an invoice</CardTitle>
        <CardDescription>
          Paste the private link you received. Its payload stays after the # and never reaches a
          server.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={open} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="invoice-link">Invoice link</Label>
            <Input
              id="invoice-link"
              type="text"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://tacitpay.example/pay#…"
              value={invoiceLink}
              onChange={(event) => setInvoiceLink(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'invoice-link-error' : undefined}
            />
            {error ? (
              <p id="invoice-link-error" role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <Button type="submit" disabled={!invoiceLink.trim()}>
            Open invoice
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

type StatusFilter = 'ALL' | InvoiceStatus;

function ReceiptsList() {
  const { api } = useTacitPay();
  const [receipts, setReceipts] = useState<ReceiptView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('ALL');

  const load = useCallback(async () => {
    setError(null);
    try {
      setReceipts(await api.listMyReceipts());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      setReceipts(null);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (receipts === null) return <TableSkeleton />;
  if (receipts.length === 0) {
    return (
      <EmptyState
        icon={<ReceiptText size={24} variant="Linear" aria-hidden="true" />}
        title="No payments yet"
        description="Open an invoice link above to make your first payment. The receipt lands here, in your private payer state."
      />
    );
  }

  // Filters are built from the receipts actually present, so the row of
  // chips never advertises a status the table cannot show.
  const statuses = [...new Set(receipts.map((receipt) => receipt.status))];
  const filtered = filter === 'ALL' ? receipts : receipts.filter((r) => r.status === filter);

  return (
    <div className="space-y-4">
      {statuses.length > 1 ? (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
          {(['ALL', ...statuses] as StatusFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                filter === value
                  ? 'border-transparent bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {value === 'ALL' ? 'All' : value.charAt(0) + value.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>Date paid</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Memo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((receipt) => (
              <TableRow key={`${receipt.invoiceId}-${receipt.txId}`}>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(receipt.paidAt)}
                </TableCell>
                <TableCell>
                  <PrivateAmount amount={receipt.amount} token={receipt.token} />
                </TableCell>
                <TableCell className="max-w-60 whitespace-normal font-medium">
                  {receipt.memo}
                </TableCell>
                <TableCell>
                  <StatusBadge status={receipt.status} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/verify/${receipt.invoiceId}`}>
                        <Verify size={16} variant="Linear" aria-hidden="true" />
                        Verify on chain
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function PaymentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Payment"
        title="Your payments"
        description="Open an invoice link to pay it, and keep the receipts of everything you have settled."
      />
      <SandboxBanner />
      <div className="space-y-8">
        <OpenInvoiceCard />
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Receipts</h2>
          <WalletGate
            title="Connect a payer wallet"
            description="Connect the wallet that paid your invoices to unlock its private receipts."
          >
            {() => <ReceiptsList />}
          </WalletGate>
        </section>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Rewire `App.tsx`** — swap the lazy import; replace the route:

```tsx
<Route path="/payments" element={<PaymentsPage />} />
<Route path="/receipts" element={<Navigate to="/payments" replace />} />
```

- [ ] **Step 3: Delete `ReceiptsPage.tsx`** — `rm packages/ui/src/pages/ReceiptsPage.tsx`.

- [ ] **Step 4: Check `InvoiceStatus` is exported from `@/lib/api`** (StatusBadge already imports it from somewhere; if `lib/api/index.tsx` does not re-export it, add it to the existing type re-export line).

- [ ] **Step 5: Gate** — `yarn workspace @tacitpay/ui run typecheck` → PASS.

---

### Task 5: Home becomes chooser (disconnected) / dashboard (connected)

**Files:**

- Rewrite: `packages/ui/src/pages/AppHomePage.tsx`
- Modify: `packages/ui/src/App.tsx` (`ANCHOR_ROUTES` drops `/app`)

**Interfaces:**

- Consumes: `useProving().connection`, `api.listMyInvoices()`, `api.listMyReceipts()`, Tasks 1–4's routes.
- Produces: nothing downstream; this is the front door.

- [ ] **Step 1: Rewrite `AppHomePage.tsx`**

Keep `EntryCard` (drop its now-unused `id` prop) and the `openInvoice` form logic. The file becomes:

```tsx
import { ArrowRight, Link21, ReceiptText, Verify, WalletMoney } from 'iconsax-reactjs';
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { EmptyState, ErrorState, TableSkeleton } from '@/components/DataStates';
import { SandboxBanner } from '@/components/SandboxBanner';
import { PrivateAmount } from '@/components/PrivateAmount';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type InvoiceView, type ReceiptView, useTacitPay } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { useProving } from '@/lib/proving-context';

// The app's front door — one route, two honest states. A visitor without a
// wallet gets the chooser: three doors and no pretence of data we cannot
// have. A connected wallet gets the dashboard: where the money actually
// stands. The gate between them is the connection itself, never a wall — the
// whitepaper's "no wallet, no account, no permission" would be disproved by
// this page asking for one at the threshold.

function EntryCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  /* unchanged body, minus the id prop */
}

function HomeChooser() {
  const { api, network } = useTacitPay();
  const navigate = useNavigate();
  const [invoiceLink, setInvoiceLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  function openInvoice(event: FormEvent<HTMLFormElement>) {
    /* unchanged from today */
  }

  return (
    <div className="space-y-10">
      <section className="max-w-2xl space-y-3 pt-2">
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          {network === 'preview' ? 'Preview network' : 'Local devnet'}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          What would you like to do?
        </h1>
        <p className="text-muted-foreground">
          Choose the path that matches your role. Nothing here is published until you approve a
          transaction in your wallet.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <EntryCard
          icon={<WalletMoney size={22} variant="Linear" aria-hidden="true" />}
          title="I'm a merchant"
          description="Create private invoices, track settlement, and withdraw paid funds."
        >
          <Button asChild className="w-full justify-between">
            <Link to="/invoices">
              Open your invoices
              <ArrowRight size={17} variant="Linear" aria-hidden="true" />
            </Link>
          </Button>
        </EntryCard>

        <EntryCard
          icon={<Link21 size={22} variant="Linear" aria-hidden="true" />}
          title="I have an invoice link"
          description="Paste the private payment link you received. Its payload stays after # and never reaches a server."
        >
          {/* unchanged paste form */}
        </EntryCard>

        <EntryCard
          icon={<Verify size={22} variant="Linear" aria-hidden="true" />}
          title="Verify an invoice"
          description="Check a public invoice status without connecting a wallet or revealing private details."
        >
          <Button asChild variant="outline" className="w-full justify-between">
            <Link to="/verification">
              Open verification
              <ArrowRight size={17} variant="Linear" aria-hidden="true" />
            </Link>
          </Button>
        </EntryCard>
      </section>
    </div>
  );
}
```

Dashboard, in the same file:

```tsx
function DashboardStrip({
  title,
  to,
  linkLabel,
  children,
}: {
  title: string;
  to: string;
  linkLabel: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-baseline justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <Link
          to={to}
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {linkLabel} →
        </Link>
      </CardHeader>
      <CardContent className="space-y-1.5">{children}</CardContent>
    </Card>
  );
}

function StripRow({
  to,
  primary,
  secondary,
}: {
  to: string;
  primary: ReactNode;
  secondary: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 -mx-2 text-sm transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="min-w-0 truncate font-medium">{primary}</span>
      <span className="shrink-0 text-muted-foreground">{secondary}</span>
    </Link>
  );
}

function HomeDashboard() {
  const { api, network } = useTacitPay();
  const [invoices, setInvoices] = useState<InvoiceView[] | null>(null);
  const [receipts, setReceipts] = useState<ReceiptView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoaded(false);
    // Both halves in one settle: a merchant-side failure must not blank the
    // payer's column, nor the other way round.
    const [mine, paid] = await Promise.allSettled([api.listMyInvoices(), api.listMyReceipts()]);
    setInvoices(mine.status === 'fulfilled' ? mine.value : null);
    setReceipts(paid.status === 'fulfilled' ? paid.value : null);
    if (mine.status === 'rejected' && paid.status === 'rejected') {
      setError(getErrorMessage(mine.reason));
    }
    setLoaded(true);
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = invoices?.filter((invoice) => invoice.status === 'OPEN') ?? [];
  const paid = invoices?.filter((invoice) => invoice.status === 'PAID') ?? [];
  const recent = receipts ? [...receipts].sort((a, b) => b.paidAt - a.paidAt) : [];
  // "Nothing yet" may only be claimed when BOTH halves genuinely answered
  // empty — a failed half must fall through to the strips, where its own
  // could-not-read message tells the truth about it.
  const nothingYet =
    loaded &&
    !error &&
    invoices !== null &&
    receipts !== null &&
    invoices.length === 0 &&
    receipts.length === 0;

  return (
    <div className="space-y-8">
      <section className="max-w-2xl space-y-3 pt-2">
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          {network === 'preview' ? 'Preview network' : 'Local devnet'}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Where things stand</h1>
        <p className="text-muted-foreground">
          The private view across your invoices and payments. Only this wallet sees these numbers.
        </p>
      </section>

      <SandboxBanner />

      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !loaded ? (
        <TableSkeleton />
      ) : nothingYet ? (
        <EmptyState
          icon={<ReceiptText size={24} variant="Linear" aria-hidden="true" />}
          title="Nothing on the ledger yet"
          description="Create your first private invoice, or open a link someone sent you."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to="/invoices">Create an invoice</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/payments">Pay an invoice</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <section className="grid gap-5 lg:grid-cols-3">
          <DashboardStrip title="Awaiting payment" to="/invoices" linkLabel="All invoices">
            {invoices === null ? (
              <p className="text-sm text-muted-foreground">Could not read invoice state.</p>
            ) : open.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open invoices.</p>
            ) : (
              open
                .slice(0, 3)
                .map((invoice) => (
                  <StripRow
                    key={invoice.invoiceId}
                    to={`/invoices/${invoice.invoiceId}`}
                    primary={invoice.memo}
                    secondary={<PrivateAmount amount={invoice.amount} token={invoice.token} />}
                  />
                ))
            )}
          </DashboardStrip>
          <DashboardStrip title="Ready to withdraw" to="/invoices" linkLabel="All invoices">
            {/* same shape over `paid` — "No paid invoices waiting." when empty */}
          </DashboardStrip>
          <DashboardStrip title="Recent payments" to="/payments" linkLabel="All payments">
            {/* same shape over `recent.slice(0, 3)` keyed `${invoiceId}-${txId}`,
                linking to `/verify/${receipt.invoiceId}`, secondary = formatDateTime(paidAt);
                "No payments made from this wallet." when empty;
                "Could not read payer state." when receipts === null */}
          </DashboardStrip>
        </section>
      )}
    </div>
  );
}

export function AppHomePage() {
  const { connection } = useProving();
  return connection ? <HomeDashboard /> : <HomeChooser />;
}
```

(The two `{/* same shape */}` markers are elision for THIS PLAN's readability only — the implementation writes all three strips in full, following the first strip's exact pattern with the stated differences.)

- [ ] **Step 2: `App.tsx`** — `ANCHOR_ROUTES` becomes `new Set(['/'])`; update its comment (the only anchor route left is the marketing page).

- [ ] **Step 3: Gate** — `yarn workspace @tacitpay/ui run typecheck` → PASS.

---

### Task 6: AppShell nav + footer speak the lifecycle

**Files:**

- Modify: `packages/ui/src/components/AppShell.tsx`

**Interfaces:**

- Consumes: routes from Tasks 1, 2, 4.
- Produces: the nav labels the docs (Task 7) reference.

- [ ] **Step 1: Relabel the navigation array**

```tsx
// The nav is the invoice's own lifecycle — issue it, pay it, prove it — with
// Settings holding the machine room. Each stage wears its own page's mark:
// Invoices the document, Payments the money leaving, Verification the same
// shield-tick the verify pages already use.
const navigation = [
  { label: 'Invoices', to: '/invoices', icon: ReceiptText },
  { label: 'Payments', to: '/payments', icon: MoneySend },
  { label: 'Verification', to: '/verification', icon: Verify },
  { label: 'Settings', to: '/settings', icon: Setting2 },
];
```

Imports: drop `Shop`, add `MoneySend`.

- [ ] **Step 2: Footer App column matches**

```tsx
{
  title: 'App',
  links: [
    { label: 'Invoices', to: '/invoices' },
    { label: 'Payments', to: '/payments' },
    { label: 'Verification', to: '/verification' },
    { label: 'Settings', to: '/settings' },
  ],
},
```

- [ ] **Step 3: Drop the hash special-case** — both NavLink `className` callbacks lose `&& !item.to.includes('#')` (no nav target carries a hash any more); becomes plain `navigationIconClass(isActive)` / `navigationClass(isActive)`.

- [ ] **Step 4: Gate** — `yarn workspace @tacitpay/ui run typecheck` → PASS.

---

### Task 7: Docs line, dangling-reference sweep, full gates

**Files:**

- Modify: `packages/docs/src/content/docs/guides/app.md:17`

- [ ] **Step 1: Reword the guide** — `**Merchant → New invoice.**` → `**Invoices → New invoice.**` (rest of the line unchanged; line 29's "merchant side" stays — role vocabulary survives).

- [ ] **Step 2: Sweep** — `grep -rn "verify-invoice" packages/ui/src packages/docs/src` → zero hits. `grep -rn "'/merchant'\|'/receipts'" packages/ui/src` → exactly the two `Navigate` redirect lines in `App.tsx`, nothing else.

- [ ] **Step 3: Full gates** — from the repo root: `yarn format:write` then `yarn format` (check mode — MUST rerun the check; `yarn format` alone only reports), `yarn lint`, `yarn typecheck`, `yarn workspace @tacitpay/ui run build`. All green.

---

### Task 8: Browser verification pass

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server** — `yarn workspace @tacitpay/ui run dev` (background). Note the port.
- [ ] **Step 2: Walk the checklist with chrome-devtools**, in BOTH themes:
  1. `/app` disconnected → chooser with three re-pointed doors. (If the browser profile's wallet is still connected from earlier sessions, disconnect via the header WalletButton first.)
  2. Connect wallet → same route flips to the dashboard live, no reload.
  3. `/invoices` → header outside gate, create dialog opens from header, rows navigate to detail.
  4. `/invoices/:id` → private and public cards, actions present per status, back link works.
  5. `/payments` → paste form outside gate, receipts behind it, filter chips when >1 status.
  6. `/verification` → form validates, submits to `/verify/:id`.
  7. `/merchant` and `/receipts` → land on `/invoices` and `/payments`.
  8. Frozen URLs end-to-end: create an invoice, copy its link, open it → `/pay#…` renders amount/memo; verify its ID → `/verify/:id` renders.
  9. Nav active states, footer links, mobile-width nav row.
- [ ] **Step 3: Leave the dev server running** and hand Marcus the URL.

## Execution note

Tasks run strictly in order; each ends at a passing typecheck so the tree never sits broken between tasks. Nothing is committed — the working tree is presented for Marcus's review at the end, alongside the already-pending `AppShell`/`WalletButton` changes.
