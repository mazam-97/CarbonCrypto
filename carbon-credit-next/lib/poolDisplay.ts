import BN from 'bn.js';

export function formatPoolTokens(raw: BN): string {
  const base = new BN(1_000_000_000);
  const whole = raw.div(base).toString(10);
  const frac = raw.mod(base).toString(10).padStart(9, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}
