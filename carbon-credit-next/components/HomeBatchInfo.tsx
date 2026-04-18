'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import { useCarbonProgram } from '@/lib/useCarbonProgram';
import type { BatchInfo } from '@/lib/types';

export function HomeBatchInfo() {
  const { loading, queryBatchInfo } = useCarbonProgram();
  const [nftMint, setNftMint] = useState('');
  const [batch, setBatch] = useState<BatchInfo | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nftMint.trim()) return;

    try {
      const info = await queryBatchInfo(nftMint.trim());
      setBatch(info);
    } catch (error) {
      console.error('Failed to get batch info:', error);
      setBatch(null);
    }
  };

  return (
    <div className="card grid">
      <h3>Get Batch Info</h3>
      <p className="small">Query any batch by NFT mint and inspect its on-chain state.</p>

      <form className="grid" onSubmit={onSubmit}>
        <input
          placeholder="Batch NFT Mint"
          value={nftMint}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setNftMint(e.target.value)}
        />
        <button disabled={loading}>Get Batch Info</button>
      </form>

      {batch && (
        <div className="grid" style={{ gap: 8 }}>
          <div className="small">Status: {batch.status}</div>
          <div className="small">NFT Mint: {batch.nftMint.toBase58()}</div>
          <div className="small">Batch PDA: {batch.pda.toBase58()}</div>
          <div className="small">Owner: {batch.owner.toBase58()}</div>
          <div className="small">Serial Number: {batch.serialNumber || '-'}</div>
          <div className="small">Quantity: {batch.quantity.toString()}</div>
          <div className="small">Vintage ID: {batch.projectVintageId.toString()}</div>
          <div className="small">
            Metadata: {batch.uri ? <a href={batch.uri} target="_blank" rel="noreferrer">{batch.uri}</a> : '-'}
          </div>
        </div>
      )}
    </div>
  );
}
