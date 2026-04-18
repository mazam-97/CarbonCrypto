'use client';

import { ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Toaster } from 'react-hot-toast';
import { RPC_ENDPOINT } from '@/lib/program';

const SolanaConnectionProvider = ConnectionProvider as any;
const SolanaWalletProvider = WalletProvider as any;
const SolanaWalletModalProvider = WalletModalProvider as any;

export function Providers({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <SolanaConnectionProvider endpoint={RPC_ENDPOINT}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <SolanaWalletModalProvider>
          {children}
          <Toaster position="top-right" />
        </SolanaWalletModalProvider>
      </SolanaWalletProvider>
    </SolanaConnectionProvider>
  );
}
