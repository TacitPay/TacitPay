---
title: Run it locally
description: The repository, the test suites, and a full private devnet on your own machine.
---

Everything can be verified on your own machine — including the privacy claims, which are tests, not prose.

## The fast path — no Docker, no wallet, no network

```bash
git clone https://github.com/TacitPay/TacitPay.git && cd TacitPay
corepack enable         # yarn 4.18 via the packageManager field
yarn install
yarn test               # full unit suite, ~seconds
yarn workspace @tacitpay/ui run dev    # the app on http://localhost:5173
```

The unit suite runs the real contract in a pure-JS runtime — including the coin circuits — so nothing is deferred to integration. Its load-bearing test runs a full lifecycle, serializes the entire public ledger, and asserts the amount is absent in four separate encodings, along with the memo, the salt, both secrets and both parties' Zswap keys. That is the privacy claim, checkable in about three seconds.

Compiling the contract yourself additionally needs the `compact` toolchain:

```bash
yarn compile            # compact compile contracts/tacitpay.compact
```

## The full loop — a private devnet

With Docker and [midnight-local-dev](https://github.com/midnightntwrk/midnight-local-dev) cloned as a sibling directory:

```bash
yarn env:up             # node :9944 · indexer :8088 · proof server :6300
yarn env:status         # container state + live endpoint probes
yarn demo:seed          # deploys + leaves three invoices in known states
TACITPAY_INT=1 yarn workspace @tacitpay/api run test   # live lifecycle, ~2 min
yarn env:down
```

The integration suite repeats the whole story against a real chain with real proofs and two separate wallets, and asserts the issuer's balance actually **increases** on withdrawal — a status flipping to WITHDRAWN only proves state changed, not that value moved. It then repeats the privacy sweep against live indexer data.

The devnet's genesis provides **shielded** funds, so the local network is also where the fully shielded settlement lane runs end to end today — see [Settlement lanes](/concepts/lanes/) for why public testnets settle unshielded for now.

## Point the app at your devnet

`yarn demo:seed` prints a contract address. In the app: Settings → network **Local devnet** → paste the address → connect → unlock. The seeded invoices are immediately explorable, including a ready-to-open pay link.
