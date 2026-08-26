import { useRef } from 'react';

import { MarketingShell } from '@/components/marketing/MarketingShell';
import { BrandSplash } from '@/components/marketing/landing/sections/BrandSplash';
import { BuiltOnSection } from '@/components/marketing/landing/sections/BuiltOnSection';
import { CannotSeeSection } from '@/components/marketing/landing/sections/CannotSeeSection';
import { DisclosureSection } from '@/components/marketing/landing/sections/DisclosureSection';
import { FinalCta } from '@/components/marketing/landing/sections/FinalCta';
import { InterlockSection } from '@/components/marketing/landing/sections/InterlockSection';
import { ProofSection } from '@/components/marketing/landing/sections/ProofSection';
import { RouteSection } from '@/components/marketing/landing/sections/RouteSection';
import { useLandingMotion } from '@/components/marketing/landing/useLandingMotion';

// The public marketing surface. No wallet, no network, no private state —
// everything here is readable by someone who has never heard of Midnight.
// "Get started" is the only door into the app (PRD §9.1).
//
// The page runs one chapter grammar. It opens on identity alone against the
// terminator, then narrows into the system: the boundary, the route the invoice
// travels, the contract that enforces it, what it all runs on, and what remains
// unseeable either way. Motion is enhancement throughout — every word here is in the DOM whether
// or not a single timeline ever runs.

export function HomePage() {
  const landing = useRef<HTMLDivElement>(null);
  useLandingMotion(landing);

  return (
    <MarketingShell>
      <div ref={landing} className="overflow-x-clip">
        <BrandSplash />
        <DisclosureSection />
        <RouteSection />
        <InterlockSection />
        <BuiltOnSection />
        <CannotSeeSection />
        <ProofSection />
        <FinalCta />
      </div>
    </MarketingShell>
  );
}
