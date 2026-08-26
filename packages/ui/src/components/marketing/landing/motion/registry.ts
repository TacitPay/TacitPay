import { animateCannotSeeDial } from './cannotSeeDial';
import { animateCircuitInterlock } from './circuitInterlock';
import { animateInvoiceRoute } from './invoiceRoute';
import type { MotionCleanup } from './liveLoop';

/** Every `[data-tp-asset]` on the page resolves to its animator through here. */
export const ASSETS: Record<string, (asset: SVGSVGElement) => MotionCleanup> = {
  'invoice-route': animateInvoiceRoute,
  'circuit-interlock': animateCircuitInterlock,
  'cannot-see-dial': animateCannotSeeDial,
};
