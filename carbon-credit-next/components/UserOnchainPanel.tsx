'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import { useCarbonProgram } from '@/lib/useCarbonProgram';

export function UserOnchainPanel() {
  const { loading, mintBatchNft, updateBatchWithData, linkWithVintage, fractionalizeBatch, wallet } = useCarbonProgram();

  const [mint, setMint] = useState({ name: '', symbol: '', uri: '' });
  const [update, setUpdate] = useState({ nftMint: '', serialNumber: '', quantity: '', uri: '' });
  const [vintage, setVintage] = useState({ nftMint: '', vintageId: '' });
  const [fractionalize, setFractionalize] = useState({ nftMint: '', tokenName: '', tokenSymbol: '' });

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); } catch (e) { console.error(e); }
  };

  const value = (e: ChangeEvent<HTMLInputElement>) => e.target.value;

  const onMint = (e: FormEvent) => {
    e.preventDefault();
    run(() => mintBatchNft(mint.name.trim(), mint.symbol.trim(), mint.uri.trim()));
  };

  const onUpdate = (e: FormEvent) => {
    e.preventDefault();
    run(() => updateBatchWithData(update.nftMint.trim(), update.serialNumber.trim(), update.quantity.trim(), update.uri.trim()));
  };

  const onLink = (e: FormEvent) => {
    e.preventDefault();
    run(() => linkWithVintage(vintage.nftMint.trim(), vintage.vintageId.trim()));
  };

  const onFractionalize = (e: FormEvent) => {
    e.preventDefault();
    run(() => fractionalizeBatch(
      fractionalize.nftMint.trim(),
      fractionalize.tokenName.trim(),
      fractionalize.tokenSymbol.trim()
    ));
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <p className="small">Wallet: {wallet?.toBase58() ?? 'Not connected'}</p>
      <div className="grid grid-2">
        <form className="card grid" onSubmit={onMint}>
          <h3>1) Mint Batch NFT</h3>
          <input placeholder="NFT Name" value={mint.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setMint({ ...mint, name: value(e) })} />
          <input placeholder="NFT Symbol" value={mint.symbol} onChange={(e: ChangeEvent<HTMLInputElement>) => setMint({ ...mint, symbol: value(e) })} />
          <input placeholder="Metadata URI" value={mint.uri} onChange={(e: ChangeEvent<HTMLInputElement>) => setMint({ ...mint, uri: value(e) })} />
          <button disabled={loading}>Mint</button>
        </form>

        <form className="card grid" onSubmit={onUpdate}>
          <h3>2) Update Batch Data</h3>
          <input placeholder="NFT Mint" value={update.nftMint} onChange={(e: ChangeEvent<HTMLInputElement>) => setUpdate({ ...update, nftMint: value(e) })} />
          <input placeholder="Serial Number" value={update.serialNumber} onChange={(e: ChangeEvent<HTMLInputElement>) => setUpdate({ ...update, serialNumber: value(e) })} />
          <input placeholder="Quantity" value={update.quantity} onChange={(e: ChangeEvent<HTMLInputElement>) => setUpdate({ ...update, quantity: value(e) })} />
          <input placeholder="Metadata URI" value={update.uri} onChange={(e: ChangeEvent<HTMLInputElement>) => setUpdate({ ...update, uri: value(e) })} />
          <button disabled={loading}>Update</button>
        </form>
      </div>

      <form className="card grid" onSubmit={onLink}>
        <h3>3) Link Vintage ID</h3>
        <input placeholder="NFT Mint" value={vintage.nftMint} onChange={(e: ChangeEvent<HTMLInputElement>) => setVintage({ ...vintage, nftMint: value(e) })} />
        <input placeholder="Vintage ID" value={vintage.vintageId} onChange={(e: ChangeEvent<HTMLInputElement>) => setVintage({ ...vintage, vintageId: value(e) })} />
        <button disabled={loading}>Link with Vintage</button>
      </form>

      <form className="card grid" onSubmit={onFractionalize}>
        <h3>4) Fractionalize Confirmed Batch</h3>
        <p className="small">Use this after the verifier confirms the batch.</p>
        <input placeholder="Confirmed NFT Mint" value={fractionalize.nftMint} onChange={(e: ChangeEvent<HTMLInputElement>) => setFractionalize({ ...fractionalize, nftMint: value(e) })} />
        <input placeholder="Fractional Token Name" value={fractionalize.tokenName} onChange={(e: ChangeEvent<HTMLInputElement>) => setFractionalize({ ...fractionalize, tokenName: value(e) })} />
        <input placeholder="Fractional Token Symbol" value={fractionalize.tokenSymbol} onChange={(e: ChangeEvent<HTMLInputElement>) => setFractionalize({ ...fractionalize, tokenSymbol: value(e) })} />
        <button disabled={loading}>Fractionalize Batch</button>
      </form>
    </div>
  );
}
