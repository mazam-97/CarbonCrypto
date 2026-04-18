import React from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { Toaster } from 'react-hot-toast';

import '@solana/wallet-adapter-react-ui/styles.css';
import ErrorBoundary from './components/ErrorBoundary';
import WalletConnection from './components/WalletConnection';
import Operations from './components/Operations';

function App() {
  // You can also provide a custom RPC endpoint
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = clusterApiUrl(network);
  
  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading --
  // Only the wallets you configure here will be compiled into your application, and only the dependencies
  // of wallets that your users connect to will be loaded
  const wallets = React.useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="text-center text-white mb-8">
                <h1 className="text-4xl md:text-5xl font-bold mb-2">
                  🌱 Carbon Credit Tokenizer
                </h1>
                <p className="text-lg md:text-xl opacity-90">
                  Tokenize and manage carbon credits on Solana blockchain
                </p>
              </div>

              {/* Wallet Connection */}
              <ErrorBoundary>
                <WalletConnection />
              </ErrorBoundary>

              {/* Operations */}
              <ErrorBoundary>
                <Operations />
              </ErrorBoundary>

              {/* Toast notifications */}
              <Toaster
                position="bottom-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    style: {
                      background: '#10b981',
                    },
                  },
                  error: {
                    style: {
                      background: '#ef4444',
                    },
                  },
                }}
              />
            </div>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
