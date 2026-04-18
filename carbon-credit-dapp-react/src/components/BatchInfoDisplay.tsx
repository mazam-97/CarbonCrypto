import React from 'react';
import { Batch } from '../types';

interface BatchInfoDisplayProps {
  batch: Batch;
}

const BatchInfoDisplay: React.FC<BatchInfoDisplayProps> = ({ batch }) => {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Fractionalized':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-xl">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Batch Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Token ID</label>
            <p className="text-lg font-semibold text-gray-900">{batch.tokenId.toString()}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Batch NFT mint</label>
            <p className="text-xs font-mono text-gray-600 break-all">{batch.nftMint.toString()}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Owner</label>
            <p className="text-sm font-mono text-gray-600">{formatAddress(batch.owner.toString())}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(batch.status)}`}>
              {batch.status}
            </span>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Quantity</label>
            <p className="text-lg font-semibold text-gray-900">{batch.quantity.toString()} tons CO₂</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Serial Number</label>
            <p className="text-sm text-gray-600">{batch.serialNumber || 'Not set'}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Project Vintage ID</label>
            <p className="text-sm text-gray-600">{batch.projectVintageId.toString()}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Metadata URI</label>
            {batch.uri ? (
              <a 
                href={batch.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
              >
                {batch.uri}
              </a>
            ) : (
              <p className="text-sm text-gray-400">Not set</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchInfoDisplay;
