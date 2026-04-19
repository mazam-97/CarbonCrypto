'use client';

import { useEffect, useState } from 'react';
import type { BatchInfo } from '@/lib/types';
import { useCarbonProgram } from '@/lib/useCarbonProgram';

export function VerifierInbox() {
  const { loading, getPendingBatches, confirmBatch, wallet } = useCarbonProgram();
  const [items, setItems] = useState<BatchInfo[]>([]);

  const refresh = async () => {
    try {
      const rows = await getPendingBatches();
      setItems(rows);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="grid stack--lg">
      <div className="card card--wallet">
        <div className="stack stack-tight">
          <span className="small" style={{ margin: 0 }}>
            Verifier wallet
          </span>
          <span className="inbox-card__id">{wallet ? wallet.toBase58() : 'Not connected'}</span>
        </div>
        <button type="button" className="btn btn--secondary" onClick={refresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh inbox'}
        </button>
      </div>

      {items.length === 0 && (
        <div className="card empty-state">No pending batches. Issuers will appear here after minting.</div>
      )}

      {items.map((b: BatchInfo) => (
        <div className="card stack" key={b.pda.toBase58()}>
          <div className="inbox-card__top">
            <div>
              <div className="section-label">Batch</div>
              <div className="inbox-card__id">{b.nftMint.toBase58()}</div>
            </div>
            <span className="badge">Qty {b.quantity.toString()}</span>
          </div>
          <dl className="dl-grid dl-grid--flush">
            <div className="dl-row">
              <dt>Serial</dt>
              <dd>{b.serialNumber || '—'}</dd>
            </div>
            <div className="dl-row">
              <dt>Owner</dt>
              <dd>{b.owner.toBase58()}</dd>
            </div>
            <div className="dl-row">
              <dt>Metadata</dt>
              <dd>
                {b.uri ? (
                  <a href={b.uri} target="_blank" rel="noreferrer">
                    {b.uri}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
          </dl>
          <div className="row">
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                try {
                  await confirmBatch(b.nftMint.toBase58());
                  await refresh();
                } catch (e) {
                  console.error(e);
                }
              }}
            >
              Confirm batch
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
