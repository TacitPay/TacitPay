// THE SHIELDING SPIKE: WalletFacade.initSwap crosses pools — unshielded NIGHT
// in, a shielded output out, to any receiver. transferTransaction refused this
// ("Insufficient funds") because it sources each output from the SAME pool;
// initSwap is the explicit crossing.
//   TARGET=mn_shield-addr_preview1… AMOUNT_NIGHT=500 node .tmp-swap-shield.mjs
import { readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { createNodeWallet } from './dist/providers/node.js';
import { HDWallet, Roles, createKeystore } from '@midnightntwrk/wallet-sdk';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { nativeToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import { MidnightBech32m, ShieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';

const target = process.env.TARGET;
if (!target?.startsWith('mn_shield-addr_preview1')) throw new Error('TARGET must be a preview shielded address');
const amountNight = BigInt(process.env.AMOUNT_NIGHT ?? '500');
const amount = amountNight * 1_000_000n;

const env = readFileSync('/Users/marcus/Projects/tacitpay/.env.preview', 'utf8');
const seedHex = env.match(/TACITPAY_SEED=([0-9a-f]{64})/i)?.[1];
const nets = JSON.parse(readFileSync('/Users/marcus/Projects/tacitpay/config/networks.json', 'utf8'));
const p = nets.preview;

const ctx = await createNodeWallet({
  networkId: 'preview',
  seedHex,
  nodeUrl: p.nodeUrl,
  indexerHttpUrl: p.indexerUrl,
  indexerWsUrl: p.indexerWsUrl,
  proofServerUrl: p.proofServerUrl,
  waitForSync: true,
});

try {
  const receiver = ShieldedAddress.codec.decode(getNetworkId(), MidnightBech32m.parse(target));
  const token = nativeToken().raw;
  console.log('token type:', token, '| swapping', amountNight.toString(), 'tNIGHT unshielded -> shielded');

  const recipe = await ctx.wallet.initSwap(
    { unshielded: { [token]: amount } },
    [{ type: 'shielded', outputs: [{ type: token, receiverAddress: receiver, amount }] }],
    { shieldedSecretKeys: ctx.zswapSecretKeys, dustSecretKey: ctx.dustSecretKey },
    { ttl: ttlOneHour(), payFees: true },
  );
  console.log('recipe built');

  const hd = HDWallet.fromSeed(Uint8Array.from(Buffer.from(seedHex, 'hex')));
  if (hd.type !== 'seedOk') throw new Error('bad seed');
  const derived = hd.hdWallet.selectAccount(0).selectRoles([Roles.NightExternal]).deriveKeysAt(0);
  hd.hdWallet.clear();
  if (derived.type !== 'keysDerived') throw new Error('derivation failed');
  const signer = createKeystore(derived.keys[Roles.NightExternal], getNetworkId());

  const signed = await ctx.wallet.signRecipe(recipe, (payload) => signer.signData(payload));
  console.log('recipe signed');
  const finalized = await ctx.wallet.finalizeRecipe(signed);
  console.log('recipe finalized (proof done)');
  const txId = await ctx.wallet.submitTransaction(finalized);
  console.log(`SWAP_SHIELD_SUBMITTED: ${amountNight.toString()} tNIGHT -> shielded @ ${target.slice(0, 34)}…  tx ${txId}`);
} catch (error) {
  console.error('SWAP_FAILED:', error?.message ?? error);
  if (error?.stack) console.error(String(error.stack).split('\n').slice(0, 8).join('\n'));
  process.exitCode = 1;
} finally {
  await ctx.close();
  process.exit(process.exitCode ?? 0);
}
