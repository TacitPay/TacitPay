import { Component, type ErrorInfo, lazy, type ReactNode, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { AppLayout } from '@/components/AppLayout';
import { AppShell } from '@/components/AppShell';
import { ErrorState } from '@/components/DataStates';
import { Button } from '@/components/ui/button';
import { getSmoothScroll } from '@/lib/smoothScroll';

// The marketing page at / is the one a stranger hits first, and it needs none of
// the chain machinery. Everything behind it is split into its own chunk so that
// first visit does not pay for the wallet, ledger and proving code.
const HomePage = lazy(async () => ({ default: (await import('@/pages/HomePage')).HomePage }));
const AppHomePage = lazy(async () => ({
  default: (await import('@/pages/AppHomePage')).AppHomePage,
}));
const InvoiceDetailPage = lazy(async () => ({
  default: (await import('@/pages/InvoiceDetailPage')).InvoiceDetailPage,
}));
const InvoicesPage = lazy(async () => ({
  default: (await import('@/pages/InvoicesPage')).InvoicesPage,
}));
const NotFoundPage = lazy(async () => ({
  default: (await import('@/pages/NotFoundPage')).NotFoundPage,
}));
const PayPage = lazy(async () => ({ default: (await import('@/pages/PayPage')).PayPage }));
const PaymentsPage = lazy(async () => ({
  default: (await import('@/pages/PaymentsPage')).PaymentsPage,
}));
const SettingsPage = lazy(async () => ({
  default: (await import('@/pages/SettingsPage')).SettingsPage,
}));
const VerificationPage = lazy(async () => ({
  default: (await import('@/pages/VerificationPage')).VerificationPage,
}));
const VerifyPage = lazy(async () => ({ default: (await import('@/pages/VerifyPage')).VerifyPage }));

// Routes whose hash is a section anchor — only the root remains, since the
// app home lost its last anchor when verification got its own page.
// Everywhere else the hash is data — /pay#<payload> carries the invoice
// itself — so it must never be treated as a scroll target.
const ANCHOR_ROUTES = new Set(['/']);

function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      // Where momentum scrolling is running it owns the viewport position, and
      // a native scroll here would animate the same value Lenis writes every
      // frame. Ask the instance instead; fall back on the app routes, which
      // have none.
      const smooth = getSmoothScroll();

      if (ANCHOR_ROUTES.has(pathname) && hash) {
        const target = document.getElementById(hash.slice(1));
        if (!target) return;
        // Both paths honour the root's `scroll-padding-top`, so neither needs
        // to know how tall the header is.
        if (smooth) smooth.scrollTo(target);
        else target.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      if (smooth) smooth.scrollTo(0, { immediate: true });
      else window.scrollTo({ top: 0, behavior: 'auto' });
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

const ON_APP_HOST =
  typeof window !== 'undefined' && window.location.hostname === 'app.tacitpay.xyz';

// SPA clicks never touch the server, so vercel.json's host redirects cannot
// catch them: any app route rendering on the marketing apex hops itself to
// app.tacitpay.xyz, fragment and query intact. Every other host is untouched.
function ApexHostGuard() {
  const location = useLocation();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hostname !== 'tacitpay.xyz') return;
    if (location.pathname === '/') return;
    window.location.replace(
      `https://app.tacitpay.xyz${location.pathname}${location.search}${location.hash}`,
    );
  }, [location]);
  return null;
}

export function App() {
  return (
    <AppErrorBoundary>
      <ScrollManager />
      <ApexHostGuard />
      <Routes>
        {/* app.tacitpay.xyz owns the root outright; every other host serves the
            marketing surface there and keeps the app under /app. */}
        {ON_APP_HOST ? null : <Route path="/" element={<HomePage />} />}

        {/* The app proper. `/app` is the door "Get started" opens. */}
        <Route element={<AppLayout />}>
          {ON_APP_HOST ? (
            <>
              <Route path="/" element={<AppHomePage />} />
              <Route path="/app" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <Route path="/app" element={<AppHomePage />} />
          )}
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/:invoiceId" element={<InvoiceDetailPage />} />
          {/* The old role-named door. Bookmarks and muscle memory land here
              for a while yet; the redirect keeps every one of them working. */}
          <Route path="/merchant" element={<Navigate to="/invoices" replace />} />
          <Route path="/pay" element={<PayPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/receipts" element={<Navigate to="/payments" replace />} />
          <Route path="/verify/:invoiceId" element={<VerifyPage />} />
          <Route path="/verification" element={<VerificationPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AppErrorBoundary>
  );
}
