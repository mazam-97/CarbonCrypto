'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import { useCarbonProgram } from '@/lib/useCarbonProgram';
import { formatPoolTokens } from '@/lib/poolDisplay';
import { fetchIndexedBatches, fetchIndexedWalletHoldings } from '@/lib/indexer';
import type { CarbonPoolInfo, IndexedBatchMint, IndexedWalletHoldings, RetirementStatsInfo } from '@/lib/types';

export function UserOnchainPanel() {
  const {
    loading,
    mintBatchNft,
    updateBatchWithData,
    linkWithVintage,
    fractionalizeBatch,
    wallet,
    fetchPoolInfo,
    fetchRetirementStats,
    depositToPool,
    retirePoolTokens,
  } = useCarbonProgram();

  const [mint, setMint] = useState({ name: '', symbol: '', uri: '' });
  const [mintSymbolError, setMintSymbolError] = useState<string | null>(null);
  const [update, setUpdate] = useState({ nftMint: '', serialNumber: '', quantity: '', uri: '' });
  const [vintage, setVintage] = useState({ nftMint: '', vintageId: '' });
  const [fractionalize, setFractionalize] = useState({ nftMint: '', tokenName: '', tokenSymbol: '' });
  const [poolInfo, setPoolInfo] = useState<CarbonPoolInfo | null | undefined>(undefined);
  const [retirementStats, setRetirementStats] = useState<RetirementStatsInfo | null | undefined>(undefined);
  const [poolDeposit, setPoolDeposit] = useState({ nftMint: '', amount: '' });
  const [retire, setRetire] = useState({ amount: '', note: '' });
  const [indexedBatches, setIndexedBatches] = useState<IndexedBatchMint[]>([]);
  const [walletHoldings, setWalletHoldings] = useState<IndexedWalletHoldings | null>(null);
  const [indexerError, setIndexerError] = useState<string | null>(null);

  const refreshIndexed = useCallback(async () => {
    const walletAddress = wallet?.toBase58();
    if (!walletAddress) {
      setIndexedBatches([]);
      setWalletHoldings(null);
      setIndexerError(null);
      return;
    }

    try {
      const rows = await fetchIndexedBatches(walletAddress, 50);
      setIndexedBatches(rows);
      const holdings = await fetchIndexedWalletHoldings(walletAddress);
      setWalletHoldings(holdings);
      setIndexerError(null);
    } catch (e) {
      console.error(e);
      setIndexerError('Indexer is unreachable. Check carbon-backend and NEXT_PUBLIC_INDEXER_API_URL.');
    }
  }, [wallet]);

  const refreshPool = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([fetchPoolInfo(), fetchRetirementStats()]);
      setPoolInfo(p);
      setRetirementStats(r);
    } catch {
      setPoolInfo(null);
      setRetirementStats(null);
    }
  }, [fetchPoolInfo, fetchRetirementStats]);

  useEffect(() => {
    void refreshPool();
  }, [refreshPool, wallet]);

  useEffect(() => {
    void refreshIndexed();
  }, [refreshIndexed]);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      console.error(e);
    }
  };

  const value = (e: ChangeEvent<HTMLInputElement>) => e.target.value;

  const onMint = (e: FormEvent) => {
    e.preventDefault();
    const symbol = mint.symbol.trim();
    if (symbol.length > 10) {
      setMintSymbolError('Symbol must be 10 characters or fewer.');
      return;
    }
    setMintSymbolError(null);
    run(async () => {
      await mintBatchNft(mint.name.trim(), symbol, mint.uri.trim());
      await refreshIndexed();
    });
  };

  const onUpdate = (e: FormEvent) => {
    e.preventDefault();
    run(() =>
      updateBatchWithData(
        update.nftMint.trim(),
        update.serialNumber.trim(),
        update.quantity.trim(),
        update.uri.trim()
      )
    );
  };

  const onLink = (e: FormEvent) => {
    e.preventDefault();
    run(() => linkWithVintage(vintage.nftMint.trim(), vintage.vintageId.trim()));
  };

  const onFractionalize = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      await fractionalizeBatch(
        fractionalize.nftMint.trim(),
        fractionalize.tokenName.trim(),
        fractionalize.tokenSymbol.trim()
      );
      await refreshPool();
    });
  };

  const onDepositPool = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      await depositToPool(poolDeposit.nftMint.trim(), poolDeposit.amount.trim());
      await refreshPool();
    });
  };

  const onRetirePool = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      await retirePoolTokens(retire.amount.trim(), retire.note);
      await refreshPool();
      setRetire({ amount: '', note: '' });
    });
  };

  return (
    <div className="grid stack--lg">
      <div className="card card--wallet">
        <span className="small" style={{ margin: 0 }}>
          Connected wallet
        </span>
        <span className="inbox-card__id text-right">
          {wallet ? wallet.toBase58() : 'Not connected'}
        </span>
      </div>

      <div className="grid grid-2">
        <form className="card stack" onSubmit={onMint}>
          <div className="section-label">Step 1</div>
          <h3>Mint batch NFT</h3>
          <input
            placeholder="NFT name"
            value={mint.name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setMint({ ...mint, name: value(e) })}
          />
          <input
            placeholder="Symbol"
            value={mint.symbol}
            maxLength={10}
            aria-invalid={mintSymbolError ? true : undefined}
            aria-describedby={mintSymbolError ? 'mint-symbol-error' : 'mint-symbol-hint'}
            className={mintSymbolError ? 'input--invalid' : undefined}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setMintSymbolError(null);
              setMint({ ...mint, symbol: value(e) });
            }}
          />
          {mintSymbolError ? (
            <p id="mint-symbol-error" className="form-error" role="alert">
              {mintSymbolError}
            </p>
          ) : (
            <p id="mint-symbol-hint" className="form-hint">
              Up to 10 characters
            </p>
          )}
          <input
            placeholder="Metadata URI"
            value={mint.uri}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setMint({ ...mint, uri: value(e) })}
          />
          <button type="submit" disabled={loading}>
            Mint
          </button>
        </form>

        <form className="card stack" onSubmit={onUpdate}>
          <div className="section-label">Step 2</div>
          <h3>Update batch data</h3>
          <input
            placeholder="NFT mint"
            value={update.nftMint}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setUpdate({ ...update, nftMint: value(e) })}
          />
          <input
            placeholder="Serial number"
            value={update.serialNumber}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setUpdate({ ...update, serialNumber: value(e) })}
          />
          <input
            placeholder="Quantity"
            value={update.quantity}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setUpdate({ ...update, quantity: value(e) })}
          />
          <input
            placeholder="Metadata URI"
            value={update.uri}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setUpdate({ ...update, uri: value(e) })}
          />
          <button type="submit" disabled={loading}>
            Update
          </button>
        </form>
      </div>

      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="section-label">Indexer</div>
            <h3 style={{ margin: '0.25rem 0 0' }}>Indexed batch mints</h3>
          </div>
          <button type="button" className="btn btn--secondary" disabled={loading} onClick={() => void refreshIndexed()}>
            Refresh indexed
          </button>
        </div>
        <p className="small">
          Batch mint events below come from your backend indexer webhook (not direct chain account scans).
        </p>
        {indexerError ? (
          <p className="form-error" role="alert">
            {indexerError}
          </p>
        ) : !wallet ? (
          <p className="small" style={{ color: 'var(--text-muted)' }}>
            Connect your wallet to view your indexed batch mints.
          </p>
        ) : indexedBatches.length === 0 ? (
          <p className="small" style={{ color: 'var(--text-muted)' }}>
            No indexed mint events yet.
          </p>
        ) : (
          <div className="stack">
            {walletHoldings && (
              <div className="card stack">
                <div className="section-label">Connected wallet holdings (indexed)</div>
                <dl className="dl-grid dl-grid--flush">
                  <div className="dl-row">
                    <dt>Minted batch events</dt>
                    <dd>{walletHoldings.summary.mintedCount}</dd>
                  </div>
                  <div className="dl-row">
                    <dt>Unique NFT mints indexed</dt>
                    <dd>{walletHoldings.summary.uniqueMintCount}</dd>
                  </div>
                  <div className="dl-row">
                    <dt>Retirement events</dt>
                    <dd>{walletHoldings.summary.retirementsCount}</dd>
                  </div>
                  <div className="dl-row">
                    <dt>Total retired (raw)</dt>
                    <dd>{walletHoldings.summary.totalRetiredRaw}</dd>
                  </div>
                </dl>
                {walletHoldings.latestRetirements.length > 0 && (
                  <div className="small">
                    Latest retirement note: {walletHoldings.latestRetirements[0]?.note || '—'}
                  </div>
                )}
              </div>
            )}
            {indexedBatches.map((item) => (
              <div className="card stack" key={`${item.signature}-${item.ixIndex}`}>
                <div className="inbox-card__top">
                  <div>
                    <div className="section-label">Mint event</div>
                    <div className="inbox-card__id">{item.signature}</div>
                  </div>
                  <span className="badge">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <dl className="dl-grid dl-grid--flush">
                  <div className="dl-row">
                    <dt>Name</dt>
                    <dd>{item.name || '—'}</dd>
                  </div>
                  <div className="dl-row">
                    <dt>Symbol</dt>
                    <dd>{item.symbol || '—'}</dd>
                  </div>
                  <div className="dl-row">
                    <dt>NFT mint</dt>
                    <dd className="inbox-card__id">{item.nftMint || 'Not decoded by webhook payload'}</dd>
                  </div>
                  <div className="dl-row">
                    <dt>Metadata URI</dt>
                    <dd>
                      {item.uri ? (
                        <a href={item.uri} target="_blank" rel="noreferrer">
                          {item.uri}
                        </a>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </div>

      <form className="card stack" onSubmit={onLink}>
        <div className="section-label">Step 3</div>
        <h3>Link vintage ID</h3>
        <div className="grid grid-2 stack">
          <input
            placeholder="NFT mint"
            value={vintage.nftMint}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setVintage({ ...vintage, nftMint: value(e) })}
          />
          <input
            placeholder="Vintage ID"
            value={vintage.vintageId}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setVintage({ ...vintage, vintageId: value(e) })}
          />
        </div>
        <button type="submit" disabled={loading}>
          Link with vintage
        </button>
      </form>

      <form className="card stack" onSubmit={onFractionalize}>
        <div className="section-label">Step 4</div>
        <h3>Fractionalize confirmed batch</h3>
        <p className="small">Available after a verifier confirms the batch.</p>
        <input
          placeholder="Confirmed NFT mint"
          value={fractionalize.nftMint}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setFractionalize({ ...fractionalize, nftMint: value(e) })
          }
        />
        <div className="grid grid-2 stack">
          <input
            placeholder="Fractional token name"
            value={fractionalize.tokenName}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setFractionalize({ ...fractionalize, tokenName: value(e) })
            }
          />
          <input
            placeholder="Fractional token symbol"
            value={fractionalize.tokenSymbol}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setFractionalize({ ...fractionalize, tokenSymbol: value(e) })
            }
          />
        </div>
        <button type="submit" disabled={loading}>
          Fractionalize batch
        </button>
      </form>

      <div className="card stack">
        <div className="section-label">Pool</div>
        <h3>Carbon pool (BCT)</h3>
        <p className="small">
          Deposit fractional batch tokens into the pool vault and receive pool tokens 1:1. Requires a fractionalized
          batch whose vintage meets the pool minimum. Pool creation is done from the verifier console (registry
          authority).
        </p>

        {poolInfo === undefined || retirementStats === undefined ? (
          <p className="small" style={{ color: 'var(--text-muted)' }}>
            Loading pool status…
          </p>
        ) : poolInfo === null ? (
          <p className="small">
            The carbon pool is not active yet. The registry authority initializes it from the{' '}
            <a href="/verifier/inbox">verifier inbox</a>.
          </p>
        ) : (
          <>
            <dl className="pool-stats grid grid-2 stack" style={{ gap: '0.5rem 1rem', margin: 0 }}>
              <dt className="small" style={{ margin: 0, color: 'var(--text-muted)' }}>
                Min vintage
              </dt>
              <dd style={{ margin: 0 }}>{poolInfo.minVintage.toString()}</dd>
              <dt className="small" style={{ margin: 0, color: 'var(--text-muted)' }}>
                Total deposited
              </dt>
              <dd style={{ margin: 0 }}>{formatPoolTokens(poolInfo.totalDeposited)} pool tokens</dd>
              <dt className="small" style={{ margin: 0, color: 'var(--text-muted)' }}>
                Total retired (global)
              </dt>
              <dd style={{ margin: 0 }}>
                {retirementStats
                  ? `${formatPoolTokens(retirementStats.totalRetired)} BCT`
                  : '0 BCT'}
              </dd>
              <dt className="small" style={{ margin: 0, color: 'var(--text-muted)' }}>
                Pool mint
              </dt>
              <dd className="inbox-card__id" style={{ margin: 0, fontSize: '0.75rem' }}>
                {poolInfo.poolMint.toBase58()}
              </dd>
            </dl>
            <form className="stack" onSubmit={onDepositPool}>
              <input
                placeholder="Batch NFT mint (same as fractionalized batch)"
                value={poolDeposit.nftMint}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setPoolDeposit({ ...poolDeposit, nftMint: e.target.value })
                }
              />
              <input
                placeholder="Amount (batch tokens, 9 decimals)"
                value={poolDeposit.amount}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setPoolDeposit({ ...poolDeposit, amount: e.target.value })
                }
              />
              <button type="submit" disabled={loading}>
                Deposit to pool
              </button>
            </form>

            <form className="stack" onSubmit={onRetirePool} style={{ marginTop: '1.25rem' }}>
              <div className="section-label">Retire</div>
              <h4 className="small" style={{ margin: '0 0 0.25rem' }}>
                Retire pool tokens (BCT)
              </h4>
              <p className="small">
                Permanently burn BCT from your wallet and add to the program-wide retired total. Optional note is
                logged on-chain for reporting (max 200 characters).
              </p>
              <input
                placeholder="Amount to retire (BCT, 9 decimals)"
                value={retire.amount}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setRetire({ ...retire, amount: e.target.value })
                }
              />
              <input
                placeholder="Note (optional, e.g. purpose or claim ID)"
                value={retire.note}
                maxLength={200}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setRetire({ ...retire, note: e.target.value })
                }
              />
              <p className="form-hint">Note: {retire.note.length}/200</p>
              <button type="submit" disabled={loading}>
                Retire BCT
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
