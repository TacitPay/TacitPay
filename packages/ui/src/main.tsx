import { Buffer } from 'buffer';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// Midnight.js's own helpers (toHex, parseCoinPublicKeyToHex, …) call Buffer directly.
// It has to exist as a global before any of that code runs, so this stays first.
globalThis.Buffer ??= Buffer;

import { App } from './App';
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';
import './index.css';
import { TacitPayProvider } from './lib/api';
import { LiveApiProvider } from './lib/api/live';
import { ProvingSessionProvider } from './lib/proving-context';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TacitPayProvider>
        <ProvingSessionProvider>
          <LiveApiProvider>
            <TooltipProvider>
              <App />
              <Toaster closeButton position="bottom-right" richColors />
            </TooltipProvider>
          </LiveApiProvider>
        </ProvingSessionProvider>
      </TacitPayProvider>
    </BrowserRouter>
  </StrictMode>,
);
