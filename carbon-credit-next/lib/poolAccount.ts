import BN from 'bn.js';
import { PublicKey } from '@solana/web3.js';
import type { CarbonPoolInfo } from './types';

/** Matches Anchor `CarbonPool` + 8-byte account discriminator (borsh layout). */
const MIN_CARBON_POOL_DATA = 8 + 32 + 8 + 8 + 1;

export function isPoolAccountDecodeError(e: unknown): boolean {
  const msg = String((e as any)?.message ?? e ?? '');
  const code = (e as any)?.code;
  return (
    code === 3002 ||
    msg.includes('AccountDiscriminatorMismatch') ||
    msg.includes('3002') ||
    msg.includes('discriminator')
  );
}

export function parseCarbonPoolRaw(data: Buffer, poolPk: PublicKey): CarbonPoolInfo {
  if (data.length < MIN_CARBON_POOL_DATA) {
    throw new Error(
      'Pool account data is too short or missing. Run `anchor build`, copy the updated IDL, and redeploy if needed.'
    );
  }
  const poolMint = new PublicKey(data.subarray(8, 40));
  const minVintage = new BN(data.subarray(40, 48), 'le');
  const totalDeposited = new BN(data.subarray(48, 56), 'le');
  const bump = data[56];
  return { pda: poolPk, poolMint, minVintage, totalDeposited, bump };
}

/**
 * Fetch pool state: normal Anchor decode first; if the IDL is stale vs on-chain data,
 * fall back to manual layout (same struct as programs/anchor CarbonPool).
 */
export async function fetchCarbonPoolFlexible(
  connection: { getAccountInfo: (pk: PublicKey) => Promise<any> },
  program: any,
  poolPk: PublicKey,
  programId: PublicKey
): Promise<CarbonPoolInfo | null> {
  const info = await connection.getAccountInfo(poolPk);
  if (!info?.data) return null;
  if (!info.owner.equals(programId)) return null;

  try {
    const acc = await (program.account as any).carbonPool.fetch(poolPk) as any;
    return {
      pda: poolPk,
      poolMint: acc.poolMint as PublicKey,
      minVintage: acc.minVintage as BN,
      totalDeposited: acc.totalDeposited as BN,
      bump: Number(acc.bump),
    };
  } catch (e) {
    if (!isPoolAccountDecodeError(e)) throw e;
    return parseCarbonPoolRaw(Buffer.from(info.data), poolPk);
  }
}
