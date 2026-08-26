import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { AppShell } from '@/components/AppShell';
import { DetailSkeleton } from '@/components/DataStates';

// Layout route for everything behind /app. Keeps AppShell's `children` API
// untouched while letting the router nest pages inside it — the marketing
// route at / renders outside this entirely.
//
// The Suspense boundary sits inside the shell so a lazily loaded route chunk
// leaves the header and navigation on screen rather than blanking the page.
export function AppLayout() {
  return (
    <AppShell>
      <Suspense fallback={<DetailSkeleton />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}
