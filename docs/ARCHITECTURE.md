# Architecture

Summary of PRD §5 — expanded with Mermaid sequence diagrams as the
implementation lands (Wave 1 Day 13).

## Components (PRD §5.1)

```
Browser (Vite + React + TS)  packages/ui
  merchant dashboard · pay page (/pay#fragment) · receipts · verify
        │
  packages/api  (TacitPayApi — the ONLY place circuit calls happen)
  Midnight.js providers: privateState (encrypted, on device) · publicData
  (indexer GraphQL) · zkConfig · proof (local :6300) · wallet (Lace via
  DApp Connector)
        │                              │
  Midnight Indexer              Local proof server (Docker)
        │
  Midnight Node  ◄── transactions
        │
  contracts/tacitpay.compact  (public ledger: invoices Map, escrow, counters)

  packages/cli — deploy + lifecycle for demos & tests
  packages/sdk, packages/mcp — Wave 2
```

## Dual-ledger mapping (PRD §5.2)

| Layer                                    | Holds                                                                                              | Why                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Public ledger (Compact `ledger`)         | `invoices` map (ownerTag, commitment, status, expiresAt, payerTag), escrow, token colour, counters | Anyone can verify existence + status; nothing reveals amount or parties. |
| Zswap shielded ledger                    | The payment coin (commitment + nullifier)                                                          | Amount and owner hidden by the protocol.                                 |
| Private state (client device, encrypted) | Merchant: secret key, invoice bodies, salts, memos. Payer: secret key, receipts.                   | Witness inputs for proofs; never transmitted.                            |
| Off-chain transport (URL fragment)       | Invoice link payload                                                                               | Merchant → payer only; browsers do not send fragments to servers.        |
