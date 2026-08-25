// @tacitpay/api — framework-agnostic wrapper around the generated contract
// module and the Midnight.js provider stack (PRD §8). Both the UI and the
// CLI/MCP call through this package, so circuit calls happen in exactly one
// place. The real TacitPayApi surface lands on Day 4–5 of Wave 1.

export const API_NAME = '@tacitpay/api';

// Invoice lifecycle states, mirrored from the contract enum (PRD §6.1).
// Wave 2 extends the enum with 'REFUNDABLE' | 'REFUNDED' (claim-based refunds,
// PRD §15.6) — mirror here when those circuits land.
export type InvoiceStatus = 'OPEN' | 'PAID' | 'WITHDRAWN' | 'CANCELLED';

// Network ids supported across the three waves (PRD §12.2 / config/networks.json).
export type NetworkId = 'undeployed' | 'preview' | 'preprod' | 'mainnet';
