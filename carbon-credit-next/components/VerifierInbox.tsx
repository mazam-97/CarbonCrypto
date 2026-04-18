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

  useEffect(() => { refresh(); }, []);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <p className="small">Verifier wallet: {wallet?.toBase58() ?? 'Not connected'}</p>
        <button onClick={refresh} disabled={loading}>Refresh Inbox</button>
      </div>

      {items.length === 0 && <div className="card">No pending batches.</div>}

      {items.map((b: BatchInfo) => (
        <div className="card grid" key={b.pda.toBase58()}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>Batch {b.nftMint.toBase58().slice(0, 8)}...</strong>
            <span className="small">Qty: {b.quantity.toString()}</span>
          </div>
          <div className="small">Serial: {b.serialNumber || '-'}</div>
          <div className="small">Owner: {b.owner.toBase58()}</div>
          <div className="small">
            Metadata: {b.uri ? <a href={b.uri} target="_blank">{b.uri}</a> : '-'}
          </div>
          <div className="row">
            <button
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
              Confirm
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
