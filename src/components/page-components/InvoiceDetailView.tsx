/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  useDeleteInvoiceMutation,
  useGenerateInvoicePdfMutation,
  useGenerateInvoicePdfProductionMutation,
  useGetInvoiceByIdQuery,
  useUpdateInvoiceMutation,
} from "@/app/redux/api/invoiceApi";
import Button from "@/components/ui/button/Button";
import ShortSpinnerPrimary from "@/components/ui/loaders/ShortSpinnerPrimary";
import ShortSpinnerDark from "@/components/ui/loaders/ShortSpinnerDark";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import InvoiceStatusBadge from "@/components/invoices/InvoiceStatusBadge";
import { isInvoiceOverdue } from "@/helpers/isInvoiceOverdue";

export default function InvoiceDetailView({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const { data: invoice, isLoading, error } = useGetInvoiceByIdQuery(invoiceId);
  const [updateInvoice, { isLoading: isUpdating }] = useUpdateInvoiceMutation();
  const [deleteInvoice, { isLoading: isDeleting }] = useDeleteInvoiceMutation();
  const isProduction = process.env.NODE_ENV === "production";
  const [generatePdf, { isLoading: isDownloadingDev }] = useGenerateInvoicePdfMutation();
  const [generatePdfProduction, { isLoading: isDownloadingProd }] = useGenerateInvoicePdfProductionMutation();
  const generateInvoicePdf = isProduction ? generatePdfProduction : generatePdf;
  const isDownloading = isProduction ? isDownloadingProd : isDownloadingDev;

  const { isOpen: isPaymentModalOpen, openModal: openPaymentModal, closeModal: closePaymentModal } = useModal();
  const [paymentAmount, setPaymentAmount] = useState("");

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <ShortSpinnerPrimary />
      </div>
    );
  }

  if (error || !invoice) {
    return <div className="text-center py-12 text-red-600">Failed to load invoice</div>;
  }

  const overdue = isInvoiceOverdue(invoice.dueDate, invoice.status);

  const handleDownload = async () => {
    try {
      const response = await generateInvoicePdf(invoice.id).unwrap();
      const url = window.URL.createObjectURL(response.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = response.filename || "invoice.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to download invoice");
    }
  };

  const handleMarkAsSent = async () => {
    try {
      await updateInvoice({ id: invoice.id, status: "sent" }).unwrap();
      toast.success("Invoice marked as sent");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update invoice");
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Cancel this invoice?")) return;
    try {
      await updateInvoice({ id: invoice.id, status: "cancelled" }).unwrap();
      toast.success("Invoice cancelled");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to cancel invoice");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this draft invoice?")) return;
    try {
      await deleteInvoice(invoice.id).unwrap();
      toast.success("Invoice deleted");
      router.push("/invoices");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete invoice");
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(paymentAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    try {
      await updateInvoice({ id: invoice.id, amountPaid: invoice.amountPaid + amount }).unwrap();
      toast.success("Payment recorded");
      setPaymentAmount("");
      closePaymentModal();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to record payment");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">{invoice.invoiceNumber}</h3>
            <InvoiceStatusBadge status={invoice.status} />
            {overdue && <span className="text-xs font-medium text-error-500">Overdue</span>}
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Billed to {invoice.contactSnapshot.name}
            {invoice.contactSnapshot.businessName ? ` (${invoice.contactSnapshot.businessName})` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? <ShortSpinnerDark /> : "Download PDF"}
          </Button>
          {invoice.status === "draft" && (
            <Button variant="primary" size="sm" onClick={handleMarkAsSent} disabled={isUpdating}>
              Mark as Sent
            </Button>
          )}
          {invoice.status !== "paid" && invoice.status !== "cancelled" && (
            <Button variant="primary" size="sm" onClick={openPaymentModal} disabled={isUpdating}>
              Record Payment
            </Button>
          )}
          {invoice.status !== "cancelled" && invoice.status !== "paid" && (
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={isUpdating}>
              Cancel Invoice
            </Button>
          )}
          {invoice.status === "draft" && (
            <Button variant="outline" size="sm" onClick={handleDelete} disabled={isDeleting}>
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">Issue Date</div>
          <div className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
            {new Date(invoice.issueDate).toLocaleDateString("en-IN")}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">Due Date</div>
          <div className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
            {new Date(invoice.dueDate).toLocaleDateString("en-IN")}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">Balance Due</div>
          <div className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
            {invoice.currency} {invoice.balanceDue.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900/60 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Rate</th>
              <th className="px-4 py-3 text-right">Tax</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {invoice.items.map((item: any, index: number) => (
              <tr key={index}>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800 dark:text-white/90">{item.name}</div>
                  {item.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                  {invoice.currency} {item.unitPrice.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{item.taxPercent}%</td>
                <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-white/90">
                  {invoice.currency} {item.total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="w-64 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-500 dark:text-gray-400">
            <span>Subtotal</span>
            <span>
              {invoice.currency} {invoice.subtotal.toFixed(2)}
            </span>
          </div>
          {invoice.discount && invoice.discount.amount > 0 && (
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Discount</span>
              <span>
                -{invoice.currency} {invoice.discount.amount.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-gray-500 dark:text-gray-400">
            <span>Tax</span>
            <span>
              {invoice.currency} {invoice.taxTotal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-1.5 text-base font-bold text-gray-800 dark:border-gray-700 dark:text-white">
            <span>Total</span>
            <span>
              {invoice.currency} {invoice.total.toFixed(2)}
            </span>
          </div>
          {invoice.amountPaid > 0 && (
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Amount Paid</span>
              <span>
                -{invoice.currency} {invoice.amountPaid.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {invoice.notes && (
        <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line">{invoice.notes}</div>
      )}

      <Modal isOpen={isPaymentModalOpen} onClose={closePaymentModal} className="max-w-[420px] p-6">
        <h4 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Record Payment</h4>
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Amount ({invoice.currency}) — balance due {invoice.balanceDue.toFixed(2)}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="h-11 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closePaymentModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isUpdating}>
              {isUpdating ? <ShortSpinnerDark /> : "Record Payment"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
