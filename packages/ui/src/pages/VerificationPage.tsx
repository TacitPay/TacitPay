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
