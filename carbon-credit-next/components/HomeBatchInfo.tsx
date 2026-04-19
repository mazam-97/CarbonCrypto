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
      <div className="section-label">Registry lookup</div>
      <h3>Batch transparency</h3>
      <p className="small">Query any batch by NFT mint and inspect its on-chain state—metadata, quantities, and status.</p>

      <form className="stack" onSubmit={onSubmit}>
        <input
          placeholder="Batch NFT mint address"
          value={nftMint}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setNftMint(e.target.value)}
          autoComplete="off"
        />
        <div className="row">
          <button type="submit" disabled={loading}>
            {loading ? 'Querying…' : 'Look up batch'}
          </button>
        </div>
      </form>

      {batch && (
        <dl className="dl-grid">
          <div className="dl-row">
            <dt>Status</dt>
            <dd>
              <span className="badge">{batch.status}</span>
            </dd>
          </div>
          <div className="dl-row">
            <dt>NFT mint</dt>
            <dd>{batch.nftMint.toBase58()}</dd>
          </div>
          <div className="dl-row">
            <dt>Batch PDA</dt>
            <dd>{batch.pda.toBase58()}</dd>
          </div>
          <div className="dl-row">
            <dt>Owner</dt>
            <dd>{batch.owner.toBase58()}</dd>
          </div>
          <div className="dl-row">
            <dt>Serial</dt>
            <dd>{batch.serialNumber || '—'}</dd>
          </div>
          <div className="dl-row">
            <dt>Quantity</dt>
            <dd>{batch.quantity.toString()}</dd>
          </div>
          <div className="dl-row">
            <dt>Vintage ID</dt>
            <dd>{batch.projectVintageId.toString()}</dd>
          </div>
          <div className="dl-row">
            <dt>Metadata</dt>
            <dd>
              {batch.uri ? (
                <a href={batch.uri} target="_blank" rel="noreferrer">
                  {batch.uri}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
