// THE PREPROD QUESTION: does Midnight Preprod accept the shielding swap that
// Preview rejects with Custom error 199? One combined run: sync, register
// NIGHT for dust, wait for spendable dust, then initSwap 100 tNIGHT to the
// deployer's OWN preprod shielded address. Loud verdict either way.
import { readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { createNodeWallet } from './dist/providers/node.js';
import { HDWallet, Roles, createKeystore } from '@midnightntwrk/wallet-sdk';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { nativeToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';

const env = readFileSync('/Users/marcus/Projects/tacitpay/.env.preview', 'utf8');
const seedHex = env.match(/TACITPAY_SEED=([0-9a-f]{64})/i)?.[1];
const nets = JSON.parse(readFileSync('/Users/marcus/Projects/tacitpay/config/networks.json', 'utf8'));
const p = nets.preprod;

const ctx = await createNodeWallet({
  networkId: 'preprod',
  seedHex,
  nodeUrl: p.nodeUrl,
  indexerHttpUrl: p.indexerUrl,
  indexerWsUrl: p.indexerWsUrl,
  proofServerUrl: process.env.PROOF_URL ?? p.proofServerUrl,
  waitForSync: true,
});

const signerFromSeed = () => {
  const hd = HDWallet.fromSeed(Uint8Array.from(Buffer.from(seedHex, 'hex')));
  if (hd.type !== 'seedOk') throw new Error('bad seed');
  const d = hd.hdWallet.selectAccount(0).selectRoles([Roles.NightExternal]).deriveKeysAt(0);
  hd.hdWallet.clear();
  if (d.type !== 'keysDerived') throw new Error('derivation failed');
  return createKeystore(d.keys[Roles.NightExternal], getNetworkId());
};

try {
  const signer = signerFromSeed();
  const state = await ctx.wallet.waitForSyncedState();
  const coins = state.unshielded.availableCoins;
  console.log(`unshielded UTXOs: ${coins.length}`);
  if (coins.length === 0) throw new Error('faucet funds not visible yet — rerun');

  const unregistered = coins.filter((c) => c.meta?.registeredForDustGeneration !== true);
  if (unregistered.length > 0) {
    const recipe = await ctx.wallet.registerNightUtxosForDustGeneration(
      unregistered,
      signer.getPublicKey(),
      (payload) => signer.signData(payload),
    );
    const finalized = await ctx.wallet.finalizeRecipe(recipe);
    const regTx = await ctx.wallet.submitTransaction(finalized);
    console.log(`REGISTERED ${unregistered.length} coin(s), tx ${regTx}`);
  } else {
    console.log('already registered');
  }

  console.log('waiting for spendable dust (target 2e15, up to 25 min)…');
  const fresh = await ctx.wallet.waitForSyncedState();
  await ctx.wallet.waitForGeneratedDust(fresh.unshielded.availableCoins, 2_000_000_000_000_000n, {
    timeoutMs: 1_500_000,
  });
  console.log('dust ready:', (await ctx.dustBalance()).toString());

  const token = nativeToken().raw;
  const amount = 100_000_000n; // 100 tNIGHT
  const receiver = await ctx.wallet.shielded.getAddress(); // self-shield
  const recipe = await ctx.wallet.initSwap(
    { unshielded: { [token]: amount } },
    [{ type: 'shielded', outputs: [{ type: token, receiverAddress: receiver, amount }] }],
    { shieldedSecretKeys: ctx.zswapSecretKeys, dustSecretKey: ctx.dustSecretKey },
    { ttl: ttlOneHour(), payFees: true },
  );
  console.log('swap recipe built');
  const signed = await ctx.wallet.signRecipe(recipe, (payload) => signer.signData(payload));
  const finalized = await ctx.wallet.finalizeRecipe(signed);
  console.log('swap proved');
  const txId = await ctx.wallet.submitTransaction(finalized);
  console.log(`SHIELD_TEST_OK: preprod accepted the shielding swap — tx ${txId}`);
} catch (error) {
  const msg = String(error?.message ?? error);
  console.error('SHIELD_TEST_FAILED:', msg);
  const { inspect } = await import('node:util');
  console.error(inspect(error, { depth: 12, maxStringLength: 1500 }).slice(0, 4000));
  if (/199/.test(inspect(error, { depth: 12 }))) console.error('VERDICT: error 199 on preprod too');
  process.exitCode = 1;
} finally {
  await ctx.close();
  process.exit(process.exitCode ?? 0);
}
