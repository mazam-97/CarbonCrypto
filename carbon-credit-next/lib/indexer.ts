import type { IndexedBatchMint, IndexedWalletHoldings } from './types';

const INDEXER_BASE_URL =
  process.env.NEXT_PUBLIC_INDEXER_API_URL?.replace(/\/+$/, '') || 'http://localhost:3000';

type IndexedBatchResponse = {
  count: number;
  items: IndexedBatchMint[];
};

export async function fetchIndexedBatches(wallet?: string, limit = 50): Promise<IndexedBatchMint[]> {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (wallet) params.set('wallet', wallet);

  const res = await fetch(`${INDEXER_BASE_URL}/api/indexer/batches?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Indexer request failed (${res.status})`);
  }

  const json = (await res.json()) as IndexedBatchResponse;
  return Array.isArray(json.items) ? json.items : [];
}

export async function fetchIndexedWalletHoldings(wallet: string): Promise<IndexedWalletHoldings> {
  const res = await fetch(`${INDEXER_BASE_URL}/api/indexer/wallet-holdings/${wallet}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Wallet holdings request failed (${res.status})`);
  }

  return (await res.json()) as IndexedWalletHoldings;
}
