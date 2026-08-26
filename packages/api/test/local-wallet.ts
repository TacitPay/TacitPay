import { Buffer } from 'node:buffer';

import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { nativeToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import {
  createKeystore,
  HDWallet,
  Roles,
  type UnshieldedKeystore,
} from '@midnightntwrk/wallet-sdk';
import { filter, firstValueFrom, map, throwError, timeout } from 'rxjs';

import { createNodeWallet, type NodeWalletContext } from '../src/providers/node.js';

const LOCAL_GENESIS_SEED = '0'.repeat(63) + '1';

export type LocalNetworkConfig = {
  readonly networkId: 'undeployed';
  readonly nodeUrl: string;
  readonly indexerHttpUrl: string;
  readonly indexerWsUrl: string;
  readonly proofServerUrl: string;
};

export type WalletBalances = {
  readonly unshielded: bigint;
  readonly shielded: bigint;
  readonly dust: bigint;
  readonly spendableDustCoins: number;
};

export type FundableWallet = {
  readonly context: NodeWalletContext;
  readonly signer: UnshieldedKeystore;
};

export type FundingTarget = {
  readonly label: string;
  readonly wallet: FundableWallet;
  readonly unshielded: bigint;
  readonly shielded: bigint;
};

export type FundingResult = {
  readonly fundingTxId?: string;
  readonly recipients: readonly {
    readonly label: string;
    readonly dustRegistrationTxId?: string;
    readonly balances: WalletBalances;
  }[];
};

const signerFromSeed = (seedHex: string): UnshieldedKeystore => {
  const hdResult = HDWallet.fromSeed(Uint8Array.from(Buffer.from(seedHex, 'hex')));
  if (hdResult.type !== 'seedOk') throw new Error('Local funding seed is invalid');
  const derived = hdResult.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.NightExternal] as const)
    .deriveKeysAt(0);
  hdResult.hdWallet.clear();
  if (derived.type !== 'keysDerived') throw new Error('Local funding key derivation failed');
  return createKeystore(derived.keys[Roles.NightExternal], getNetworkId());
};

export const openFundableWallet = async (
  config: LocalNetworkConfig,
  seedHex: string,
): Promise<FundableWallet> => {
  const context = await createNodeWallet({ ...config, seedHex });
  const signer = signerFromSeed(seedHex);
  if (signer.getBech32Address().asString() !== context.accountId) {
    await context.close();
    throw new Error('Derived funding signer does not match the wallet account');
  }
  return { context, signer };
};

export const nativeBalances = async (wallet: NodeWalletContext): Promise<WalletBalances> => {
  const state = await firstValueFrom(wallet.wallet.state());
  const token = nativeToken().raw;
  return {
    unshielded: state.unshielded.balances[token] ?? 0n,
    shielded: state.shielded.balances[token] ?? 0n,
    dust: state.dust.balance(new Date()),
    spendableDustCoins: state.dust.availableCoins.length,
  };
};

const validateAmount = (amount: bigint, label: string): void => {
  if (amount < 0n) throw new RangeError(`${label} must not be negative`);
};

export const waitForNativeBalances = async (
  wallet: NodeWalletContext,
  minimum: Pick<WalletBalances, 'unshielded' | 'shielded'>,
  timeoutMs: number,
): Promise<WalletBalances> => {
  const token = nativeToken().raw;
  return firstValueFrom(
    wallet.wallet.state().pipe(
      map((state) => ({
        unshielded: state.unshielded.balances[token] ?? 0n,
        shielded: state.shielded.balances[token] ?? 0n,
        dust: state.dust.balance(new Date()),
        spendableDustCoins: state.dust.availableCoins.length,
      })),
      filter(
        (balances) =>
          balances.unshielded >= minimum.unshielded && balances.shielded >= minimum.shielded,
      ),
      timeout({
        first: timeoutMs,
        with: () =>
          throwError(
            () =>
              new Error(
                `Wallet did not reach ${minimum.unshielded.toString()} unshielded and ${minimum.shielded.toString()} shielded NIGHT within ${timeoutMs}ms`,
              ),
          ),
      }),
    ),
  );
};

const waitForSpendableDust = async (
  wallet: NodeWalletContext,
  timeoutMs: number,
): Promise<WalletBalances> =>
  firstValueFrom(
    wallet.wallet.state().pipe(
      map((state) => ({
        unshielded: state.unshielded.balances[nativeToken().raw] ?? 0n,
        shielded: state.shielded.balances[nativeToken().raw] ?? 0n,
        dust: state.dust.balance(new Date()),
        spendableDustCoins: state.dust.availableCoins.length,
      })),
      filter((balances) => balances.dust > 0n && balances.spendableDustCoins > 0),
      timeout({
        first: timeoutMs,
        with: () =>
          throwError(() => new Error(`Wallet has no spendable DUST coin after ${timeoutMs}ms`)),
      }),
    ),
  );

const registerNightForDust = async (wallet: FundableWallet): Promise<string | undefined> => {
  const state = await wallet.context.wallet.waitForSyncedState();
  const unregistered = state.unshielded.availableCoins.filter(
    (coin) => coin.meta.registeredForDustGeneration !== true,
  );
  if (unregistered.length === 0) return undefined;
  const recipe = await wallet.context.wallet.registerNightUtxosForDustGeneration(
    unregistered,
    wallet.signer.getPublicKey(),
    (payload) => wallet.signer.signData(payload),
  );
  const finalized = await wallet.context.wallet.finalizeRecipe(recipe);
  return wallet.context.wallet.submitTransaction(finalized);
};

const transferNative = async (
  sender: FundableWallet,
  recipients: readonly Omit<FundingTarget, 'label'>[],
): Promise<string> => {
  const token = nativeToken().raw;
  const unshieldedOutputs = await Promise.all(
    recipients
      .filter((recipient) => recipient.unshielded > 0n)
      .map(async (recipient) => ({
        type: token,
        receiverAddress: await recipient.wallet.context.wallet.unshielded.getAddress(),
        amount: recipient.unshielded,
      })),
  );
  const shieldedOutputs = await Promise.all(
    recipients
      .filter((recipient) => recipient.shielded > 0n)
      .map(async (recipient) => ({
        type: token,
        receiverAddress: await recipient.wallet.context.wallet.shielded.getAddress(),
        amount: recipient.shielded,
      })),
  );
  const outputs = [
    ...(unshieldedOutputs.length === 0
      ? []
      : [{ type: 'unshielded' as const, outputs: unshieldedOutputs }]),
    ...(shieldedOutputs.length === 0
      ? []
      : [{ type: 'shielded' as const, outputs: shieldedOutputs }]),
  ];
  if (outputs.length === 0) throw new Error('At least one positive funding amount is required');

  const recipe = await sender.context.wallet.transferTransaction(
    outputs,
    {
      shieldedSecretKeys: sender.context.zswapSecretKeys,
      dustSecretKey: sender.context.dustSecretKey,
    },
    { ttl: ttlOneHour() },
  );
  const signed = await sender.context.wallet.signRecipe(recipe, (payload) =>
    sender.signer.signData(payload),
  );
  const finalized = await sender.context.wallet.finalizeRecipe(signed);
  return sender.context.wallet.submitTransaction(finalized);
};

export const fundLocalWallets = async (
  config: LocalNetworkConfig,
  targets: readonly FundingTarget[],
  timeoutMs: number,
): Promise<FundingResult> => {
  const genesis = await openFundableWallet(config, LOCAL_GENESIS_SEED);
  try {
    await registerNightForDust(genesis);
    await waitForSpendableDust(genesis.context, timeoutMs);

    const before = await Promise.all(
      targets.map((target) => nativeBalances(target.wallet.context)),
    );
    const topUps = targets.map((target, index) => {
      validateAmount(target.unshielded, `${target.label} unshielded target`);
      validateAmount(target.shielded, `${target.label} shielded target`);
      return {
        wallet: target.wallet,
        unshielded:
          before[index].unshielded >= target.unshielded
            ? 0n
            : target.unshielded - before[index].unshielded,
        shielded:
          before[index].shielded >= target.shielded ? 0n : target.shielded - before[index].shielded,
      };
    });
    const needsFunding = topUps.some((topUp) => topUp.unshielded > 0n || topUp.shielded > 0n);
    const fundingTxId = needsFunding ? await transferNative(genesis, topUps) : undefined;
    await Promise.all(
      targets.map((target) =>
        waitForNativeBalances(
          target.wallet.context,
          { unshielded: target.unshielded, shielded: target.shielded },
          timeoutMs,
        ),
      ),
    );

    const dustRegistrationTxIds: Array<string | undefined> = [];
    for (const target of targets) {
      dustRegistrationTxIds.push(await registerNightForDust(target.wallet));
    }
    const balances = await Promise.all(
      targets.map((target) => waitForSpendableDust(target.wallet.context, timeoutMs)),
    );
    return {
      fundingTxId,
      recipients: targets.map((target, index) => ({
        label: target.label,
        dustRegistrationTxId: dustRegistrationTxIds[index],
        balances: balances[index],
      })),
    };
  } finally {
    await genesis.context.close();
  }
};
