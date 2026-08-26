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
import { ProvingSessionProvider } from './lib/proving-context';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TacitPayProvider>
        <ProvingSessionProvider>
          <TooltipProvider>
            <App />
            <Toaster closeButton position="bottom-right" richColors />
          </TooltipProvider>
        </ProvingSessionProvider>
      </TacitPayProvider>
    </BrowserRouter>
  </StrictMode>,
);
