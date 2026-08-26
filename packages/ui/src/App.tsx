import { Component, type ErrorInfo, lazy, type ReactNode, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

import { AppLayout } from '@/components/AppLayout';
import { AppShell } from '@/components/AppShell';
import { ErrorState } from '@/components/DataStates';
import { Button } from '@/components/ui/button';
import { HomePage } from '@/pages/HomePage';

// The marketing page at / is the one a stranger hits first, and it needs none of
// the chain machinery. Everything behind it is split into its own chunk so that
// first visit does not pay for the wallet, ledger and proving code.
const AppHomePage = lazy(async () => ({
  default: (await import('@/pages/AppHomePage')).AppHomePage,
}));
const MerchantPage = lazy(async () => ({
  default: (await import('@/pages/MerchantPage')).MerchantPage,
}));
const NotFoundPage = lazy(async () => ({
  default: (await import('@/pages/NotFoundPage')).NotFoundPage,
}));
const PayPage = lazy(async () => ({ default: (await import('@/pages/PayPage')).PayPage }));
const ReceiptsPage = lazy(async () => ({
  default: (await import('@/pages/ReceiptsPage')).ReceiptsPage,
}));
const SettingsPage = lazy(async () => ({
  default: (await import('@/pages/SettingsPage')).SettingsPage,
}));
const VerifyPage = lazy(async () => ({ default: (await import('@/pages/VerifyPage')).VerifyPage }));

// Routes whose hash is a section anchor. Everywhere else the hash is data —
// /pay#<payload> carries the invoice itself — so it must never be treated as
// a scroll target.
const ANCHOR_ROUTES = new Set(['/', '/app']);

function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (ANCHOR_ROUTES.has(pathname) && hash) {
        document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hash, pathname]);

  return null;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('TacitPay route error', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <AppShell>
          <ErrorState
            title="TacitPay could not render this page"
            message="Your private state is unchanged. Reload the app to try again."
          />
          <Button type="button" className="mt-4" onClick={() => window.location.reload()}>
            Reload app
          </Button>
        </AppShell>
      );
    }
    return this.props.children;
  }
}

export function App() {
  return (
    <AppErrorBoundary>
      <ScrollManager />
      <Routes>
        {/* Public marketing surface — no wallet, no app chrome. */}
        <Route path="/" element={<HomePage />} />

        {/* The app proper. `/app` is the door "Get started" opens. */}
        <Route element={<AppLayout />}>
          <Route path="/app" element={<AppHomePage />} />
          <Route path="/merchant" element={<MerchantPage />} />
          <Route path="/pay" element={<PayPage />} />
          <Route path="/receipts" element={<ReceiptsPage />} />
          <Route path="/verify/:invoiceId" element={<VerifyPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AppErrorBoundary>
  );
}
