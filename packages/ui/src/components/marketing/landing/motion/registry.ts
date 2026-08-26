import { animateCannotSeeDial } from './cannotSeeDial';
import { animateCircuitInterlock } from './circuitInterlock';
import { animateDisclosureCorridor } from './disclosureCorridor';
import { animateInvoiceRoute } from './invoiceRoute';
import type { MotionCleanup } from './liveLoop';

/** Every `[data-tp-asset]` on the page resolves to its animator through here. */
export const ASSETS: Record<string, (asset: SVGSVGElement) => MotionCleanup> = {
  'invoice-route': animateInvoiceRoute,
  'disclosure-corridor': animateDisclosureCorridor,
  'circuit-interlock': animateCircuitInterlock,
  'cannot-see-dial': animateCannotSeeDial,
};
