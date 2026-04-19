'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import type { BatchInfo, CarbonPoolInfo } from '@/lib/types';
import { formatPoolTokens } from '@/lib/poolDisplay';
import { useCarbonProgram } from '@/lib/useCarbonProgram';

export function VerifierInbox() {
  const {
    loading,
    getPendingBatches,
    confirmBatch,
    wallet,
    fetchPoolInfo,
    initializePool,
  } = useCarbonProgram();
  const [items, setItems] = useState<BatchInfo[]>([]);
  const [poolInfo, setPoolInfo] = useState<CarbonPoolInfo | null | undefined>(undefined);
  const [poolInit, setPoolInit] = useState({ minVintage: '', name: '', symbol: '', uri: '' });
  const [poolSymbolError, setPoolSymbolError] = useState<string | null>(null);

  const refreshInbox = async () => {
    try {
      const rows = await getPendingBatches();
      setItems(rows);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshPoolState = useCallback(async () => {
    try {
      const p = await fetchPoolInfo();
      setPoolInfo(p);
    } catch {
      setPoolInfo(null);
    }
  }, [fetchPoolInfo]);

  useEffect(() => {
    void refreshInbox();
  }, []);

  useEffect(() => {
    void refreshPoolState();
  }, [refreshPoolState, wallet]);

  const onInitPool = (e: FormEvent) => {
    e.preventDefault();
    const symbol = poolInit.symbol.trim();
    if (symbol.length > 10) {
      setPoolSymbolError('Symbol must be 10 characters or fewer.');
      return;
    }
    setPoolSymbolError(null);
    (async () => {
      try {
        await initializePool(
          poolInit.minVintage.trim(),
          poolInit.name.trim(),
          symbol,
          poolInit.uri.trim()
        );
        await refreshPoolState();
        setPoolInit({ minVintage: '', name: '', symbol: '', uri: '' });
      } catch (err) {
        console.error(err);
      }
    })();
  };

  return (
    <div className="grid stack--lg">
      <div className="card card--wallet">
        <div className="stack stack-tight">
          <span className="small" style={{ margin: 0 }}>
            Verifier wallet
          </span>
          <span className="inbox-card__id">{wallet ? wallet.toBase58() : 'Not connected'}</span>
        </div>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => {
            void refreshInbox();
            void refreshPoolState();
          }}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="card stack">
        <div className="section-label">Pool</div>
        <h3>Carbon pool (BCT)</h3>
        <p className="small">
          Initialize the pool mint, Metaplex metadata (name, symbol, URI), and minimum project vintage. The connected
          wallet pays rent and signs. Issuers deposit fractional tokens from the issuer console once the pool exists.
        </p>

        {poolInfo === undefined ? (
          <p className="small" style={{ color: 'var(--text-muted)' }}>
            Loading pool status…
          </p>
        ) : poolInfo === null ? (
          !wallet ? (
            <p className="small">Connect your wallet to initialize the pool.</p>
          ) : (
            <form className="stack" onSubmit={onInitPool}>
              <p className="small">No pool exists yet. Create one for this deployment.</p>
              <input
                placeholder="Minimum vintage ID (integer)"
                value={poolInit.minVintage}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setPoolInit({ ...poolInit, minVintage: e.target.value })
                }
              />
              <input
                placeholder="Pool token display name"
                value={poolInit.name}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setPoolInit({ ...poolInit, name: e.target.value })
                }
              />
              <input
                placeholder="Symbol (max 10)"
                value={poolInit.symbol}
                maxLength={10}
                aria-invalid={poolSymbolError ? true : undefined}
                className={poolSymbolError ? 'input--invalid' : undefined}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setPoolSymbolError(null);
                  setPoolInit({ ...poolInit, symbol: e.target.value });
                }}
              />
              {poolSymbolError ? (
                <p className="form-error" role="alert">
                  {poolSymbolError}
                </p>
              ) : (
                <p className="form-hint">Up to 10 characters (Metaplex)</p>
              )}
              <input
                placeholder="Metadata URI (JSON)"
                value={poolInit.uri}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setPoolInit({ ...poolInit, uri: e.target.value })
                }
              />
              <button type="submit" disabled={loading}>
                Initialize pool
              </button>
            </form>
          )
        ) : (
          <>
            <dl className="dl-grid dl-grid--flush">
              <div className="dl-row">
                <dt>Status</dt>
                <dd>Pool active</dd>
              </div>
              <div className="dl-row">
                <dt>Min vintage</dt>
                <dd>{poolInfo.minVintage.toString()}</dd>
              </div>
              <div className="dl-row">
                <dt>Total deposited</dt>
                <dd>{formatPoolTokens(poolInfo.totalDeposited)} pool tokens</dd>
              </div>
              <div className="dl-row">
                <dt>Pool mint</dt>
                <dd className="inbox-card__id" style={{ fontSize: '0.75rem' }}>
                  {poolInfo.poolMint.toBase58()}
                </dd>
              </div>
            </dl>
            {/* Close pool (registry): hidden for now — re-enable with closePool from useCarbonProgram + fetchRegistryAuthority if needed
            {registryAuthority && wallet && registryAuthority.equals(wallet) && (
              <div className="stack" style={{ marginTop: '1rem' }}>
                <p className="small" style={{ color: 'var(--text-muted)' }}>
                  Close pool (registry only): revokes mint authority on the pool mint and deletes the pool PDA so you
                  can run initialize again. The mint and Metaplex metadata accounts stay on-chain; vault ATAs and any
                  BCT balances are not automatically removed.
                </p>
                <button
                  type="button"
                  className="btn btn--secondary"
                  disabled={loading}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        'Close this pool program state? You can initialize a new pool afterward. Continue?'
                      )
                    ) {
                      return;
                    }
                    try {
                      await closePool();
                      await refreshPoolState();
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                >
                  Close pool
                </button>
              </div>
            )}
            */}
          </>
        )}
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
                  await refreshInbox();
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
