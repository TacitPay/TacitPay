import { Outlet } from 'react-router-dom';

import { AppShell } from '@/components/AppShell';

// Layout route for everything behind /app. Keeps AppShell's `children` API
// untouched while letting the router nest pages inside it — the marketing
// route at / renders outside this entirely.
export function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
