import { Logo } from './components/Logo';

// Landing placeholder. The real routes — /, /merchant, /pay#…, /receipts,
// /verify/:id, /settings — land on Days 6–9 of Wave 1 (PRD §9.1).
export function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6">
      <Logo size={40} badge="Preview" />
      <p className="max-w-md text-center text-sm leading-relaxed text-zinc-500">
        Private by default, provable on demand. Invoices settle in stablecoins on Midnight — the
        amount, the parties, and the contents stay off the public ledger.
      </p>
      <p className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[11px] text-zinc-500">
        Wave 1 scaffold — merchant, pay, receipts &amp; verify views land per PRD §9
      </p>
    </main>
  );
}
