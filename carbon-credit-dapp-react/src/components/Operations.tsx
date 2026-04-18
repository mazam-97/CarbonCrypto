import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram } from '../hooks/useAnchorProgram';
import { BatchFormData, Batch } from '../types';
import OperationCard from './OperationCard';
import BatchInfoDisplay from './BatchInfoDisplay';

const Operations: React.FC = () => {
  const { connected } = useWallet();
  const {
    isRegistryAdmin,
    loading,
    initializeRegistry,
    mintBatchNft,
    updateBatchData,
    linkWithVintage,
    confirmBatch,
    rejectBatch,
    fractionalizeBatch,
    queryBatchInfo,
  } = useAnchorProgram();

  const [batchInfo, setBatchInfo] = useState<Batch | null>(null);

  const handleInitializeRegistry = async () => {
    try {
      await initializeRegistry();
    } catch (error) {
      console.error('Failed to initialize registry:', error);
    }
  };

  const handleMintBatchNft = async (data: BatchFormData) => {
    if (!data.nftName?.trim() || !data.nftSymbol?.trim() || !data.uri?.trim()) return;
    try {
      await mintBatchNft(data.nftName.trim(), data.nftSymbol.trim(), data.uri.trim());
    } catch (error) {
      console.error('Failed to mint batch:', error);
    }
  };

  const handleUpdateBatchData = async (data: BatchFormData) => {
    if (!data.nftMint || !data.serialNumber || !data.quantity || !data.uri) return;
    try {
      await updateBatchData(data.nftMint, data.serialNumber, data.quantity, data.uri);
    } catch (error) {
      console.error('Failed to update batch:', error);
    }
  };

  const handleLinkWithVintage = async (data: BatchFormData) => {
    if (!data.nftMint || !data.vintageId) return;
    try {
      await linkWithVintage(data.nftMint, data.vintageId);
    } catch (error) {
      console.error('Failed to link vintage:', error);
    }
  };

  const handleConfirmBatch = async (data: BatchFormData) => {
    if (!data.nftMint) return;
    try {
      await confirmBatch(data.nftMint);
    } catch (error) {
      console.error('Failed to confirm batch:', error);
    }
  };

  const handleRejectBatch = async (data: BatchFormData) => {
    if (!data.nftMint || !data.comment) return;
    try {
      await rejectBatch(data.nftMint, data.comment);
    } catch (error) {
      console.error('Failed to reject batch:', error);
    }
  };

  const handleFractionalizeBatch = async (data: BatchFormData) => {
    if (!data.nftMint || !data.tokenName || !data.tokenSymbol) return;
    try {
      await fractionalizeBatch(data.nftMint, data.tokenName, data.tokenSymbol);
    } catch (error) {
      console.error('Failed to fractionalize batch:', error);
    }
  };

  const handleQueryBatch = async (data: BatchFormData) => {
    if (!data.nftMint?.trim()) return;
    try {
      const info = await queryBatchInfo(data.nftMint.trim());
      setBatchInfo(info);
    } catch (error) {
      console.error('Failed to query batch:', error);
      setBatchInfo(null);
    }
  };

  if (!connected) {
    return (
      <div className="text-center py-12">
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            Connect Your Wallet
          </h3>
          <p className="text-gray-600">
            Please connect your wallet to access the Carbon Credit Tokenizer operations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Initialize Registry */}
      <OperationCard
        title="Initialize Registry"
        description="Set up the carbon credit registry (Admin only)"
        buttonText="Initialize Registry"
        buttonVariant="primary"
        onSubmit={handleInitializeRegistry}
        loading={loading}
        disabled={!isRegistryAdmin}
        fields={[]}
      />

      {/* Mint Batch NFT */}
      <OperationCard
        title="Mint Batch NFT"
        description="Create a new batch NFT (Metaplex metadata + on-chain batch account)"
        buttonText="Mint Batch NFT"
        buttonVariant="primary"
        onSubmit={handleMintBatchNft}
        loading={loading}
        fields={[
          {
            name: 'nftName',
            label: 'NFT name',
            type: 'text',
            placeholder: 'e.g. Carbon Batch #1',
            required: true,
          },
          {
            name: 'nftSymbol',
            label: 'NFT symbol',
            type: 'text',
            placeholder: 'e.g. CCB (max 10 chars)',
            required: true,
          },
          {
            name: 'uri',
            label: 'Metadata URI',
            type: 'text',
            placeholder: 'https://…/metadata.json',
            required: true,
          },
        ]}
      />

      {/* Update Batch Data */}
      <OperationCard
        title="Update Batch Data"
        description="Add metadata to an existing batch"
        buttonText="Update Batch"
        buttonVariant="primary"
        onSubmit={handleUpdateBatchData}
        loading={loading}
        fields={[
          {
            name: 'nftMint',
            label: 'Batch NFT mint address',
            type: 'text',
            placeholder: 'Base58 mint pubkey',
            required: true,
          },
          {
            name: 'serialNumber',
            label: 'Serial Number',
            type: 'text',
            placeholder: 'e.g., VCS-001-2024',
            required: true,
          },
          {
            name: 'quantity',
            label: 'Quantity (tons CO2)',
            type: 'number',
            placeholder: 'e.g., 1000',
            required: true,
          },
          {
            name: 'uri',
            label: 'Metadata URI',
            type: 'text',
            placeholder: 'https://metadata.example.com/batch.json',
            required: true,
          },
        ]}
      />

      {/* Link with Vintage */}
      <OperationCard
        title="Link with Project Vintage"
        description="Associate batch with a project vintage"
        buttonText="Link Vintage"
        buttonVariant="primary"
        onSubmit={handleLinkWithVintage}
        loading={loading}
        fields={[
          {
            name: 'nftMint',
            label: 'Batch NFT mint address',
            type: 'text',
            placeholder: 'Base58 mint pubkey',
            required: true,
          },
          {
            name: 'vintageId',
            label: 'Project Vintage ID',
            type: 'number',
            placeholder: 'e.g., 2024001',
            required: true,
          },
        ]}
      />

      {/* Confirm Batch */}
      <OperationCard
        title="Confirm Batch"
        description="Approve batch for tokenization (Admin only)"
        buttonText="Confirm Batch"
        buttonVariant="success"
        onSubmit={handleConfirmBatch}
        loading={loading}
        disabled={!isRegistryAdmin}
        fields={[
          {
            name: 'nftMint',
            label: 'Batch NFT mint address',
            type: 'text',
            placeholder: 'Base58 mint pubkey',
            required: true,
          },
        ]}
      />

      {/* Reject Batch */}
      <OperationCard
        title="Reject Batch"
        description="Reject batch with reason (Admin only)"
        buttonText="Reject Batch"
        buttonVariant="danger"
        onSubmit={handleRejectBatch}
        loading={loading}
        disabled={!isRegistryAdmin}
        fields={[
          {
            name: 'nftMint',
            label: 'Batch NFT mint address',
            type: 'text',
            placeholder: 'Base58 mint pubkey',
            required: true,
          },
          {
            name: 'comment',
            label: 'Rejection Reason',
            type: 'textarea',
            placeholder: 'Enter reason for rejection',
            required: true,
          },
        ]}
      />

      {/* Fractionalize Batch */}
      <OperationCard
        title="Fractionalize Batch"
        description="Convert confirmed batch to SPL tokens"
        buttonText="Fractionalize to Tokens"
        buttonVariant="success"
        onSubmit={handleFractionalizeBatch}
        loading={loading}
        fields={[
          {
            name: 'nftMint',
            label: 'Batch NFT mint address',
            type: 'text',
            placeholder: 'Base58 mint pubkey',
            required: true,
          },
          {
            name: 'tokenName',
            label: 'Token name',
            type: 'text',
            placeholder: 'e.g. Carbon Credit Ton',
            required: true,
          },
          {
            name: 'tokenSymbol',
            label: 'Token symbol',
            type: 'text',
            placeholder: 'e.g. CCT',
            required: true,
          },
        ]}
      />

      {/* Query Batch Info */}
      <div className="md:col-span-2 lg:col-span-3">
        <OperationCard
          title="Query Batch Info"
          description="Use the batch NFT mint address (from mint transaction or wallet)"
          buttonText="Get Batch Info"
          buttonVariant="primary"
          onSubmit={handleQueryBatch}
          loading={loading}
          fields={[
            {
              name: 'nftMint',
              label: 'Batch NFT mint address',
              type: 'text',
              placeholder: 'Base58 mint pubkey',
              required: true,
            },
          ]}
        />
        
        {batchInfo && (
          <div className="mt-6">
            <BatchInfoDisplay batch={batchInfo} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Operations;
