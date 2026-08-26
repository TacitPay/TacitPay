import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

// tacitpay.xyz is the marketing apex; the product lives on app.tacitpay.xyz.
// Every other host (previews, localhost, the subdomain itself) stays SPA-routed.
export const APP_ORIGIN = 'https://app.tacitpay.xyz';

export const onMarketingApex = () =>
  typeof window !== 'undefined' && window.location.hostname === 'tacitpay.xyz';

/** A link into the app that hops hosts on the marketing apex. */
export function AppLink({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: ReactNode;
}) {
  if (onMarketingApex()) {
    return (
      <a href={`${APP_ORIGIN}${to}`} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}
