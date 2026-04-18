import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAnchorProgram } from '../hooks/useAnchorProgram';

const WalletConnection: React.FC = () => {
  const { connected, publicKey, connecting } = useWallet();
  const { program, isRegistryAdmin, checkRegistryAdmin } = useAnchorProgram();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (connected && publicKey && program) {
      setLoading(true);
      checkRegistryAdmin()
        .finally(() => setLoading(false));
    }
  }, [connected, publicKey, program, checkRegistryAdmin]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-xl mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
        Wallet Connection
      </h2>
      
      <div className="text-center">
        <WalletMultiButton className="!bg-gradient-to-r !from-purple-500 !to-pink-500 hover:!from-purple-600 hover:!to-pink-600 !transition-all !duration-300 !transform hover:!scale-105" />
        
        {connecting && (
          <div className="mt-4 text-gray-600">
            <div className="loading-spinner mr-2"></div>
            Connecting wallet...
          </div>
        )}
        
        {connected && publicKey && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-gray-700">
                Address: <span className="font-mono">{formatAddress(publicKey.toString())}</span>
              </span>
              {loading && <div className="loading-spinner"></div>}
              {!loading && isRegistryAdmin && (
                <span className="bg-pink-100 text-pink-800 px-2 py-1 rounded-full text-xs font-semibold">
                  Registry Admin
                </span>
              )}
            </div>
          </div>
        )}
        
        {!connected && (
          <p className="mt-4 text-gray-600">
            Connect your wallet to interact with the Carbon Credit Tokenizer
          </p>
        )}
      </div>
    </div>
  );
};

export default WalletConnection;
