import { ArrowRight, Link21, Verify, WalletMoney } from 'iconsax-reactjs';
import { type FormEvent, type ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useTacitPay } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// The app's front door at /app — reached from the marketing page's "Get
// started" (PRD §9.1). Everything here needs the app chrome; the public pitch
// lives at / and needs none of it.

function EntryCard({
  icon,
  title,
  description,
  children,
  id,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <Card className="h-full scroll-mt-24" id={id}>
      <CardHeader>
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="leading-6">{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function AppHomePage() {
  const { api, network } = useTacitPay();
  const navigate = useNavigate();
  const [invoiceLink, setInvoiceLink] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  function openInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = invoiceLink.trim();
    try {
      api.decodeLink(value);
      const hashIndex = value.indexOf('#');
      const fragment = hashIndex >= 0 ? value.slice(hashIndex + 1) : value;
      setLinkError(null);
      navigate(`/pay#${fragment}`);
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : 'This invoice link is not valid.');
    }
  }

  function verifyInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = invoiceId.trim();
    if (!/^[0-9a-f]{64}$/iu.test(value)) {
      setVerifyError('Enter a 64-character hexadecimal invoice ID.');
      return;
    }
    setVerifyError(null);
    navigate(`/verify/${value.toLowerCase()}`);
  }

  return (
    <div className="space-y-10">
      <section className="max-w-2xl space-y-3 pt-2">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">
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
            <Link to="/merchant">
              Open merchant dashboard
              <ArrowRight size={17} variant="Linear" aria-hidden="true" />
            </Link>
          </Button>
        </EntryCard>

        <EntryCard
          icon={<Link21 size={22} variant="Linear" aria-hidden="true" />}
          title="I have an invoice link"
          description="Paste the private payment link you received. Its payload stays after # and never reaches a server."
        >
          <form onSubmit={openInvoice} className="space-y-3" noValidate>
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
                aria-invalid={linkError ? true : undefined}
                aria-describedby={linkError ? 'invoice-link-error' : 'invoice-link-help'}
              />
              {linkError ? (
                <p id="invoice-link-error" role="alert" className="text-sm text-destructive">
                  {linkError}
                </p>
              ) : (
                <p id="invoice-link-help" className="text-xs text-muted-foreground">
                  The private payload must follow the # fragment.
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={!invoiceLink.trim()}>
              Open invoice
            </Button>
          </form>
        </EntryCard>

        <EntryCard
          id="verify"
          icon={<Verify size={22} variant="Linear" aria-hidden="true" />}
          title="Verify an invoice"
          description="Check a public invoice status without connecting a wallet or revealing private details."
        >
          <form id="verify-invoice" onSubmit={verifyInvoice} className="space-y-3" noValidate>
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
                aria-invalid={verifyError ? true : undefined}
                aria-describedby={verifyError ? 'invoice-id-error' : undefined}
                className="font-mono"
              />
              {verifyError ? (
                <p id="invoice-id-error" role="alert" className="text-sm text-destructive">
                  {verifyError}
                </p>
              ) : null}
            </div>
            <Button type="submit" variant="outline" className="w-full" disabled={!invoiceId.trim()}>
              Verify on chain
            </Button>
          </form>
        </EntryCard>
      </section>
    </div>
  );
}
