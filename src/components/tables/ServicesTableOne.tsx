/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import {
  useDeleteServiceMutation,
  useGetServicesQuery,
} from '@/app/redux/api/serviceApi';
import { useModal } from '@/hooks/useModal';
import { Modal } from '../ui/modal';
import Select from '../form/Select';
import { ChevronDownIcon } from '@/icons';
import ShortSpinnerPrimary from '../ui/loaders/ShortSpinnerPrimary';
import BasicPagination from '../ui/pagination/BasicPagination';
import EditServiceForm from '../form/service-form/EditService';
import Badge from '../ui/badge/Badge';

const ServicesTableOne: React.FC = () => {
  const { isOpen, openModal, closeModal } = useModal();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const { data, error, isLoading } = useGetServicesQuery({ page, limit, search });
  const [deleteService, { isLoading: isDeleting }] = useDeleteServiceMutation();

  const options = [
    { value: '10', label: '10' },
    { value: '15', label: '15' },
    { value: '25', label: '25' },
    { value: '50', label: '50' },
  ];

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (value: string) => {
    setLimit(parseInt(value, 10));
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleEditClick = (id: string) => {
    setSelectedServiceId(id);
    openModal();
  };

  const handleCloseModal = () => {
    setSelectedServiceId(null);
    closeModal();
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Delete this service?');
    if (!confirmed) return;
    try {
      await deleteService(id).unwrap();
      toast.success('Service deleted successfully');
    } catch (deleteError: any) {
      toast.error(deleteError?.data?.message || 'Failed to delete service');
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="mb-4 px-5 py-3 flex gap-3 justify-between">
        <input
          type="text"
          placeholder="Search services..."
          value={search}
          onChange={handleSearchChange}
          className="w-full max-w-xl rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
        <div className="relative">
          <Select
            options={options}
            defaultValue="10"
            placeholder="Items per page"
            onChange={handleLimitChange}
            className="dark:bg-dark-900"
          />
          <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
            <ChevronDownIcon />
          </span>
        </div>
      </div>
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Price</th>
              <th className="px-5 py-3">Billing</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Description</th>
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={7} className="px-5 py-4 text-center">
                  <div className="w-full flex justify-center">
                    <ShortSpinnerPrimary />
                  </div>
                </td>
              </tr>
            )}
            {error && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={7} className="px-5 py-4 text-center text-red-500">
                  Error: {(error as any).data?.message || 'Failed to fetch services'}
                </td>
              </tr>
            )}
            {!isLoading && !error && data?.services.length === 0 && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={7} className="px-5 py-4 text-center">
                  No services found
                </td>
              </tr>
            )}
            {!isLoading &&
              !error &&
              data?.services.map((service) => (
                <tr key={service.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                  <td className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                    {service.name}
                  </td>
                  <td className="px-5 py-4">{service.category || 'N/A'}</td>
                  <td className="px-5 py-4">
                    {service.currency} {service.price.toFixed(2)}
                  </td>
                  <td className="px-5 py-4">{service.billingType}</td>
                  <td className="px-5 py-4">
                    {service.isActive ? (
                      <Badge variant="light" color="success">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="light" color="error">
                        Inactive
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="max-w-48 line-clamp-2">{service.description || 'No description'}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEditClick(service.id)}
                        className="text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-sm px-3 py-2 dark:bg-blue-600 dark:hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(service.id)}
                        disabled={isDeleting}
                        className="text-white bg-red-700 hover:bg-red-800 font-medium rounded-lg text-sm px-3 py-2 disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="px-5 py-3 text-gray-800 dark:text-white/90 flex justify-between items-center">
          <div className="text-sm">
            Page {data.page} of {data.totalPages} ({data.total} services)
          </div>
          <BasicPagination
            currentPage={data.page}
            totalPages={data.totalPages}
            onPageChange={handlePageChange}
            onPrev={() => handlePageChange(data.page - 1)}
            onNext={() => handlePageChange(data.page + 1)}
          />
        </div>
      )}

      {selectedServiceId && (
        <Modal isOpen={isOpen} onClose={handleCloseModal} className="max-w-[700px] p-6 lg:p-10">
          <EditServiceForm id={selectedServiceId} onClose={handleCloseModal} />
        </Modal>
      )}
    </div>
  );
};

export default ServicesTableOne;

