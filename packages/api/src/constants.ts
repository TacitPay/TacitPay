import { fromHex } from '@midnight-ntwrk/midnight-js-utils';

/** NIGHT's native token colour is Compact's default Bytes<32> value. */
export const NIGHT_TOKEN_COLOR_HEX = '00'.repeat(32);

/** Preview tUSDM colour verified in PRD §16.2. */
export const PREVIEW_USDM_TOKEN_COLOR_HEX =
  '003bacd9a361ba0d425e408776020e40271375e8b8de42d73eec046a44947d73';

/** Fresh arrays prevent callers from mutating the canonical hex constants. */
export const NIGHT_TOKEN_COLOR = Uint8Array.from(fromHex(NIGHT_TOKEN_COLOR_HEX));
export const PREVIEW_USDM_TOKEN_COLOR = Uint8Array.from(fromHex(PREVIEW_USDM_TOKEN_COLOR_HEX));

/** NIGHT and USDM both use six smallest-unit decimals in Wave 1. */
export const TOKEN_DECIMALS = 6;

/** Compact's invoice amount and expiry fields are Uint<64>. */
export const MAX_UINT64 = 18_446_744_073_709_551_615n;
