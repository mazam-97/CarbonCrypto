'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import { useCarbonProgram } from '@/lib/useCarbonProgram';

export function UserOnchainPanel() {
  const { loading, mintBatchNft, updateBatchWithData, linkWithVintage, fractionalizeBatch, wallet } =
    useCarbonProgram();

  const [mint, setMint] = useState({ name: '', symbol: '', uri: '' });
  const [mintSymbolError, setMintSymbolError] = useState<string | null>(null);
  const [update, setUpdate] = useState({ nftMint: '', serialNumber: '', quantity: '', uri: '' });
  const [vintage, setVintage] = useState({ nftMint: '', vintageId: '' });
  const [fractionalize, setFractionalize] = useState({ nftMint: '', tokenName: '', tokenSymbol: '' });

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
    run(() => mintBatchNft(mint.name.trim(), symbol, mint.uri.trim()));
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
    run(() =>
      fractionalizeBatch(
        fractionalize.nftMint.trim(),
        fractionalize.tokenName.trim(),
        fractionalize.tokenSymbol.trim()
      )
    );
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
    </div>
  );
}
