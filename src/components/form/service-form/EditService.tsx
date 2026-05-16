/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import {
  useGetServiceByIdQuery,
  useUpdateServiceMutation,
} from '@/app/redux/api/serviceApi';
import Button from '@/components/ui/button/Button';
import ShortSpinnerDark from '@/components/ui/loaders/ShortSpinnerDark';
import { toast } from 'react-toastify';

interface EditServiceFormProps {
  id: string;
  onClose: () => void;
}

export default function EditServiceForm({ id, onClose }: EditServiceFormProps) {
  const { data: service, isLoading: isFetching } = useGetServiceByIdQuery(id);
  const [updateService, { isLoading: isUpdating }] = useUpdateServiceMutation();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    price: '',
    currency: 'INR' as 'INR' | 'USD' | 'EUR' | 'GBP',
    billingType: 'one-time' as 'one-time' | 'monthly' | 'quarterly' | 'yearly',
    taxPercent: '0',
    isActive: true,
  });

  useEffect(() => {
    if (!service) return;
    setFormData({
      name: service.name || '',
      category: service.category || '',
      description: service.description || '',
      price: String(service.price ?? ''),
      currency: service.currency || 'INR',
      billingType: service.billingType || 'one-time',
      taxPercent: String(service.taxPercent ?? 0),
      isActive: service.isActive ?? true,
    });
  }, [service]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const price = Number(formData.price);
    const taxPercent = Number(formData.taxPercent);

    if (!formData.name.trim()) {
      setError('Service name is required.');
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setError('Price must be a valid non-negative number.');
      return;
    }
    if (Number.isNaN(taxPercent) || taxPercent < 0 || taxPercent > 100) {
      setError('Tax percent must be between 0 and 100.');
      return;
    }

    try {
      await updateService({
        id,
        name: formData.name.trim(),
        category: formData.category.trim(),
        description: formData.description.trim(),
        price,
        currency: formData.currency,
        billingType: formData.billingType,
        taxPercent,
        isActive: formData.isActive,
      }).unwrap();
      toast.success('Service updated successfully');
      onClose();
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to update service');
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center">
        <ShortSpinnerDark />
      </div>
    );
  }

  if (!service) {
    return <p className="text-sm text-red-500">Service not found.</p>;
  }

  return (
    <>
      <h2 className="mb-6 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
        Edit Service
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Name
          </label>
          <input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>
        <div>
          <label
            htmlFor="category"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Category
          </label>
          <input
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="price" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Price
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              className="dark:bg-dark-900 h-11 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
          <div>
            <label
              htmlFor="currency"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
            >
              Currency
            </label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              className="dark:bg-dark-900 h-11 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="billingType"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
            >
              Billing Type
            </label>
            <select
              id="billingType"
              name="billingType"
              value={formData.billingType}
              onChange={handleInputChange}
              className="dark:bg-dark-900 h-11 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="one-time">One-time</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="taxPercent"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
            >
              Tax %
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              id="taxPercent"
              name="taxPercent"
              value={formData.taxPercent}
              onChange={handleInputChange}
              className="dark:bg-dark-900 h-11 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="description"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            className="dark:bg-dark-900 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-400">
          <input
            type="checkbox"
            name="isActive"
            checked={formData.isActive}
            onChange={handleInputChange}
            className="h-4 w-4 rounded border-gray-300"
          />
          Active service
        </label>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isUpdating}>
            {isUpdating ? <ShortSpinnerDark /> : 'Update Service'}
          </Button>
        </div>
      </form>
    </>
  );
}

