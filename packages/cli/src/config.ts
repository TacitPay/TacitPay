import { readFile, rename, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  NIGHT_TOKEN_COLOR,
  PREVIEW_USDM_TOKEN_COLOR,
  bytes32FromHex,
  bytes32ToHex,
  parseHexBytes32,
} from '@tacitpay/api';

export type CliNetwork = 'local' | 'preview';

export type NetworkConfig = {
  readonly networkId: 'undeployed' | 'preview';
  readonly nodeUrl: string;
  readonly indexerUrl: string;
  readonly indexerWsUrl: string;
  readonly proofServerUrl: string;
};

export type Deployment = {
  readonly contractAddress: string;
  readonly deployedAt: string;
  readonly compilerVersion: string;
  readonly paymentToken: string;
  readonly txId: string;
};

export const MANAGED_DIR = fileURLToPath(
  new URL('../../../contracts/managed/tacitpay', import.meta.url),
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const requireString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} is missing or invalid`);
  }
  return value;
};

export const parseCliNetwork = (value: string): CliNetwork => {
  if (value !== 'local' && value !== 'preview') {
    throw new Error('network must be local or preview');
  }
  return value;
};

export const selectedNetwork = (): CliNetwork =>
  parseCliNetwork(process.env.TACITPAY_NETWORK ?? 'preview');

export const loadNetworkConfig = async (network: CliNetwork): Promise<NetworkConfig> => {
  const raw: unknown = JSON.parse(
    await readFile(new URL('../../../config/networks.json', import.meta.url), 'utf8'),
  );
  if (!isRecord(raw)) throw new Error('config/networks.json must contain an object');
  const key = network === 'local' ? 'undeployed' : 'preview';
  const entry = raw[key];
  if (!isRecord(entry)) throw new Error(`config/networks.json is missing ${key}`);
  return {
    networkId: key,
    nodeUrl: requireString(entry.nodeUrl, `${key}.nodeUrl`),
    indexerUrl: requireString(entry.indexerUrl, `${key}.indexerUrl`),
    indexerWsUrl: requireString(entry.indexerWsUrl, `${key}.indexerWsUrl`),
    proofServerUrl: requireString(entry.proofServerUrl, `${key}.proofServerUrl`),
  };
};

const deploymentPath = (network: CliNetwork): string =>
  fileURLToPath(new URL(`../../../deployments/${network}.json`, import.meta.url));

export const loadDeployment = async (network: CliNetwork): Promise<Deployment> => {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(deploymentPath(network), 'utf8'));
  } catch (error) {
    if (isRecord(error) && error.code === 'ENOENT') {
      throw new Error(`No ${network} deployment found; run tacitpay deploy first`);
    }
    throw error;
  }
  if (!isRecord(raw)) throw new Error(`deployments/${network}.json must contain an object`);
  return {
    contractAddress: parseHexBytes32(
      requireString(raw.contractAddress, 'deployment.contractAddress'),
      'deployment.contractAddress',
    ),
    deployedAt: requireString(raw.deployedAt, 'deployment.deployedAt'),
    compilerVersion: requireString(raw.compilerVersion, 'deployment.compilerVersion'),
    paymentToken: parseHexBytes32(
      requireString(raw.paymentToken, 'deployment.paymentToken'),
      'deployment.paymentToken',
    ),
    txId: requireString(raw.txId, 'deployment.txId'),
  };
};

export const saveDeployment = async (
  network: CliNetwork,
  deployment: Deployment,
): Promise<void> => {
  const target = deploymentPath(network);
  const temporary = `${target}.tmp`;
  await mkdir(dirname(target), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(deployment, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, target);
};

const parseEnvValue = (value: string): string => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const seedFromEnvFile = async (network: CliNetwork): Promise<string | undefined> => {
  const path = fileURLToPath(new URL(`../../../.env.${network}`, import.meta.url));
  let contents: string;
  try {
    contents = await readFile(path, 'utf8');
  } catch (error) {
    if (isRecord(error) && error.code === 'ENOENT') return undefined;
    throw error;
  }
  for (const line of contents.split(/\r?\n/u)) {
    const match = /^\s*(?:export\s+)?TACITPAY_SEED\s*=\s*(.*?)\s*$/u.exec(line);
    if (match !== null) return parseEnvValue(match[1]);
  }
  return undefined;
};

export const loadSeed = async (network: CliNetwork): Promise<string> => {
  const seed = process.env.TACITPAY_SEED ?? (await seedFromEnvFile(network));
  if (seed === undefined || !/^[0-9a-f]{64}$/i.test(seed)) {
    throw new Error(
      `Set TACITPAY_SEED to a 32-byte hex seed in the environment or .env.${network}`,
    );
  }
  return seed.toLowerCase();
};

export const parseToken = (value: string): Uint8Array => {
  if (value === 'NIGHT') return Uint8Array.from(NIGHT_TOKEN_COLOR);
  if (value === 'USDM') return Uint8Array.from(PREVIEW_USDM_TOKEN_COLOR);
  return bytes32FromHex(value, 'token');
};

export const compilerVersion = async (): Promise<string> => {
  const raw: unknown = JSON.parse(
    await readFile(
      new URL('../../../contracts/managed/tacitpay/compiler/contract-info.json', import.meta.url),
      'utf8',
    ),
  );
  if (!isRecord(raw)) throw new Error('Compact contract-info.json must contain an object');
  return requireString(raw['compiler-version'], 'compiler-version');
};

export const deploymentFromResult = async (input: {
  readonly contractAddress: string;
  readonly paymentToken: Uint8Array;
  readonly txId: string;
}): Promise<Deployment> => ({
  contractAddress: parseHexBytes32(input.contractAddress, 'contractAddress'),
  deployedAt: new Date().toISOString(),
  compilerVersion: await compilerVersion(),
  paymentToken: bytes32ToHex(input.paymentToken, 'paymentToken'),
  txId: input.txId,
});
