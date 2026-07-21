/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import {
  useDeleteInvoiceMutation,
  useGenerateInvoicePdfMutation,
  useGenerateInvoicePdfProductionMutation,
  useGetInvoicesQuery,
} from '@/app/redux/api/invoiceApi';
import Select from '../form/Select';
import { ChevronDownIcon, EyeIcon } from '@/icons';
import ShortSpinnerPrimary from '../ui/loaders/ShortSpinnerPrimary';
import VeryShortSpinnerPrimary from '../ui/loaders/veryShortSpinnerPrimary';
import BasicPagination from '../ui/pagination/BasicPagination';
import InvoiceStatusBadge from '../invoices/InvoiceStatusBadge';
import DownloadIcon from '../ui/flowbiteIcons/DownloadIcon';
import DeleteIcon from '../ui/flowbiteIcons/Delete';
import { isInvoiceOverdue } from '@/helpers/isInvoiceOverdue';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10' },
  { value: '15', label: '15' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
];

const InvoicesTableOne: React.FC = () => {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, error, isLoading } = useGetInvoicesQuery({ page, limit, search, status });
  const [deleteInvoice, { isLoading: isDeleting }] = useDeleteInvoiceMutation();
  const isProduction = process.env.NODE_ENV === 'production';
  const [generatePdf] = useGenerateInvoicePdfMutation();
  const [generatePdfProduction] = useGenerateInvoicePdfProductionMutation();
  const generateInvoicePdf = isProduction ? generatePdfProduction : generatePdf;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const handleLimitChange = (value: string) => {
    setLimit(parseInt(value, 10));
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Delete this draft invoice?');
    if (!confirmed) return;
    try {
      await deleteInvoice(id).unwrap();
      toast.success('Invoice deleted successfully');
    } catch (deleteError: any) {
      toast.error(deleteError?.data?.message || 'Failed to delete invoice');
    }
  };

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    try {
      const response = await generateInvoicePdf(id).unwrap();
      const url = window.URL.createObjectURL(response.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.filename || 'invoice.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError: any) {
      toast.error(downloadError?.data?.message || 'Failed to download invoice');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="mb-4 flex flex-wrap gap-3 justify-between px-5 py-3">
        <input
          type="text"
          placeholder="Search by invoice # or contact..."
          value={search}
          onChange={handleSearchChange}
          className="w-full max-w-xl rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
        <div className="flex gap-3">
          <Select options={STATUS_OPTIONS} defaultValue="" placeholder="Status" onChange={handleStatusChange} className="dark:bg-dark-900" />
          <div className="relative">
            <Select options={PAGE_SIZE_OPTIONS} defaultValue="10" placeholder="Items per page" onChange={handleLimitChange} className="dark:bg-dark-900" />
            <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
              <ChevronDownIcon />
            </span>
          </div>
        </div>
      </div>
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th className="px-5 py-3">Invoice #</th>
              <th className="px-5 py-3">Contact</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Total</th>
              <th className="px-5 py-3">Balance Due</th>
              <th className="px-5 py-3">Due Date</th>
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
                  Error: {(error as any).data?.message || 'Failed to fetch invoices'}
                </td>
              </tr>
            )}
            {!isLoading && !error && data?.invoices.length === 0 && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={7} className="px-5 py-4 text-center">
                  No invoices found
                </td>
              </tr>
            )}
            {!isLoading &&
              !error &&
              data?.invoices.map((invoice) => {
                const overdue = isInvoiceOverdue(invoice.dueDate, invoice.status);
                return (
                  <tr key={invoice.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                    <td className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-5 py-4">{invoice.contactSnapshot.name}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <InvoiceStatusBadge status={invoice.status} />
                        {overdue && <span className="text-xs font-medium text-error-500">Overdue</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {invoice.currency} {invoice.total.toFixed(2)}
                    </td>
                    <td className="px-5 py-4">
                      {invoice.currency} {invoice.balanceDue.toFixed(2)}
                    </td>
                    <td className="px-5 py-4">{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => router.push(`/invoices/${invoice.id}`)}
                          title="View"
                          aria-label="View invoice"
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-700 text-white hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-700"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(invoice.id)}
                          disabled={downloadingId === invoice.id}
                          title="Download"
                          aria-label="Download invoice PDF"
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-700"
                        >
                          {downloadingId === invoice.id ? <VeryShortSpinnerPrimary /> : <DownloadIcon className="h-4 w-4" />}
                        </button>
                        {invoice.status === 'draft' && (
                          <button
                            onClick={() => handleDelete(invoice.id)}
                            disabled={isDeleting}
                            title="Delete"
                            aria-label="Delete invoice"
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-700 text-white hover:bg-red-800 disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-700"
                          >
                            <DeleteIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="px-5 py-3 text-gray-800 dark:text-white/90 flex justify-between items-center">
          <div className="text-sm">
            Page {data.page} of {data.totalPages} ({data.total} invoices)
          </div>
          <BasicPagination
            currentPage={data.page}
            totalPages={data.totalPages}
            onPageChange={setPage}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </div>
      )}
    </div>
  );
};

export default InvoicesTableOne;
