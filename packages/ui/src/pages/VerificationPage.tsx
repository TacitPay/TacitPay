import { SearchStatus, Verify } from 'iconsax-reactjs';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// The truth gate as a place of its own — set in a block explorer's register,
// because that is the shelf every chain user already knows: one wide search
// bar in the middle of the page, and nothing else asking for attention. The
// app's other pages read left-aligned like documents; this one centres like a
// tool, deliberately, since its whole job is a single lookup. Wallet-free:
// nothing here reads private state, so nothing here may ask for a connection.

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
    // Sparse on purpose: a search page earns its authority by what it does
    // not say. The title, the whitepaper's six words, the bar, and the three
    // things the ledger answers — nothing else.
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center py-8 text-center md:py-20">
      <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
        Verify an invoice
      </h1>
      <p className="mt-4 text-base leading-7 text-muted-foreground">
        No wallet, no account, no permission.
      </p>

      <form onSubmit={verify} className="mt-10 w-full" noValidate>
        <label htmlFor="invoice-id" className="sr-only">
          Invoice ID
        </label>
        {/* One explorer bar rather than a labelled form: the input IS the
            page. The bar owns the border and the focus ring so the input and
            the button read as one instrument, not a field with a button
            parked beside it. */}
        <div className="flex items-center gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
          <SearchStatus
            size={20}
            variant="Linear"
            aria-hidden="true"
            className="ml-2.5 shrink-0 text-muted-foreground"
          />
          <Input
            id="invoice-id"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="Search by invoice ID — 64 hex characters"
            value={invoiceId}
            onChange={(event) => setInvoiceId(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'invoice-id-error' : undefined}
            className="h-12 flex-1 border-0 bg-transparent font-mono text-sm shadow-none focus-visible:ring-0 md:text-base dark:bg-transparent"
          />
          <Button
            type="submit"
            disabled={!invoiceId.trim()}
            className="h-12 shrink-0 rounded-xl px-5"
          >
            <Verify size={18} variant="Linear" aria-hidden="true" />
            <span className="hidden sm:inline">Verify on chain</span>
            <span className="sm:hidden">Verify</span>
          </Button>
        </div>
        {error ? (
          <p id="invoice-id-error" role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </form>

      {/* What the ledger answers, in its own three words — and the limit in
          four more. The claim is only credible with it. */}
      <div
        className="mt-14 flex items-center gap-3 font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase"
        aria-hidden="true"
      >
        <span>Exists</span>
        <span>·</span>
        <span>Status</span>
        <span>·</span>
        <span>Expiry</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Everything else stays private.</p>
    </div>
  );
}
