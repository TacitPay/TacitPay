import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

// tacitpay.xyz is the marketing apex; the product lives on app.tacitpay.xyz.
// Every other host (previews, localhost, the subdomain itself) stays SPA-routed.
export const APP_ORIGIN = 'https://app.tacitpay.xyz';
export const MARKETING_ORIGIN = 'https://tacitpay.xyz';

export const onMarketingApex = () =>
  typeof window !== 'undefined' && window.location.hostname === 'tacitpay.xyz';

export const onAppHost = () =>
  typeof window !== 'undefined' && window.location.hostname === 'app.tacitpay.xyz';

/** A link into the app that hops hosts on the marketing apex. Extra anchor
 *  attributes (aria-label, title, …) pass through to whichever element wins. */
export function AppLink({
  to,
  className,
  children,
  ...rest
}: {
  to: string;
  className?: string;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'>) {
  if (onMarketingApex()) {
    // The subdomain owns the root, so the /app segment collapses onto it.
    const hop = to === '/app' ? '/' : to.startsWith('/app#') ? `/${to.slice(4)}` : to;
    return (
      <a href={`${APP_ORIGIN}${hop}`} className={className} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={className} {...rest}>
      {children}
    </Link>
  );
}

/** AppLink's mirror: a link back to the marketing site. The app host carries no
 *  route for `/` (see App.tsx — the marketing page is registered only off it),
 *  so there the link has to hop origins; everywhere else it stays SPA-routed. */
export function SiteLink({
  to = '/',
  className,
  children,
  ...rest
}: {
  to?: string;
  className?: string;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'>) {
  if (onAppHost()) {
    return (
      <a href={`${MARKETING_ORIGIN}${to === '/' ? '' : to}`} className={className} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={className} {...rest}>
      {children}
    </Link>
  );
}
