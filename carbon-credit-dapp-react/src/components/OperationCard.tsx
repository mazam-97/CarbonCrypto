import React, { useState } from 'react';
import { BatchFormData } from '../types';

interface FormField {
  name: keyof BatchFormData;
  label: string;
  type: 'text' | 'number' | 'textarea';
  placeholder: string;
  required?: boolean;
}

interface OperationCardProps {
  title: string;
  description?: string;
  buttonText: string;
  buttonVariant?: 'primary' | 'success' | 'danger';
  onSubmit: (data: BatchFormData) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  fields: FormField[];
}

const OperationCard: React.FC<OperationCardProps> = ({
  title,
  description,
  buttonText,
  buttonVariant = 'primary',
  onSubmit,
  loading = false,
  disabled = false,
  fields,
}) => {
  const [formData, setFormData] = useState<BatchFormData>({
    nftMint: '',
    nftName: '',
    nftSymbol: '',
    serialNumber: '',
    quantity: '',
    uri: '',
    vintageId: '',
    comment: '',
    tokenName: '',
    tokenSymbol: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (name: keyof BatchFormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = fields.filter(field => field.required);
    const missingFields = requiredFields.filter(field => !formData[field.name]);
    
    if (missingFields.length > 0) {
      alert(`Please fill in: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
      // Reset form on success
      setFormData({
        nftMint: '',
        serialNumber: '',
        quantity: '',
        uri: '',
        vintageId: '',
        comment: '',
        tokenName: '',
        tokenSymbol: '',
      });
    } catch (error) {
      console.error('Operation failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getButtonClasses = () => {
    const baseClasses = 'w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100';
    
    switch (buttonVariant) {
      case 'success':
        return `${baseClasses} bg-green-500 hover:bg-green-600 text-white focus:ring-green-200`;
      case 'danger':
        return `${baseClasses} bg-red-500 hover:bg-red-600 text-white focus:ring-red-200`;
      default:
        return `${baseClasses} bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white focus:ring-purple-200`;
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-xl">
      <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-600 mb-4 text-sm">{description}</p>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                value={formData[field.name] || ''}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
            ) : (
              <input
                type={field.type}
                value={formData[field.name] || ''}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
            )}
          </div>
        ))}
        
        <button
          type="submit"
          disabled={disabled || loading || submitting}
          className={getButtonClasses()}
        >
          {(loading || submitting) ? (
            <div className="flex items-center justify-center">
              <div className="loading-spinner mr-2"></div>
              Processing...
            </div>
          ) : (
            buttonText
          )}
        </button>
      </form>
    </div>
  );
};

export default OperationCard;
