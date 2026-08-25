// tacitpay CLI (PRD §10): deploy, invoice lifecycle, wallet helpers for demos
// and integration tests. Wallets come from @midnight-ntwrk/wallet-sdk seeded
// via TACITPAY_SEED (.env.*, gitignored). Commands land with packages/api.

const PLANNED_COMMANDS = `tacitpay CLI — scaffold placeholder

Planned commands (PRD §10):
  tacitpay deploy --network local|preview|mainnet --token NIGHT|USDM|<hex>
  tacitpay invoice create --amount <n> --memo "..." [--expires <date>]
  tacitpay invoice pay --link <url>
  tacitpay invoice withdraw|cancel|status --id <hex>
  tacitpay wallet fund-local | dust-status`;

const [, , command] = process.argv;

if (command === undefined || command === 'help') {
  console.log(PLANNED_COMMANDS);
  process.exit(0);
}

console.error(
  `tacitpay: unknown command '${command}' — commands arrive with the Wave 1 contract work.`,
);
process.exit(1);
