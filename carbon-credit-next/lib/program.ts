import { PublicKey } from '@solana/web3.js';
import type { Idl } from '@coral-xyz/anchor';
import idlJson from '../../target/idl/carbon_credit_tokenizer.json';

export const IDL = idlJson as Idl;
export const PROGRAM_ID = new PublicKey(idlJson.address);
export const RPC_ENDPOINT = 'https://api.devnet.solana.com';
