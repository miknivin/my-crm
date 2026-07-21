/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import Button from "@/components/ui/button/Button";
import ShortSpinnerDark from "@/components/ui/loaders/ShortSpinnerDark";
import { useGetServicesQuery } from "@/app/redux/api/serviceApi";
import { useGetContactsQuery } from "@/app/redux/api/contactApi";
import {
  useCreateInvoiceMutation,
  useGenerateInvoicePdfMutation,
  useGenerateInvoicePdfProductionMutation,
} from "@/app/redux/api/invoiceApi";

interface ContactPreview {
  _id: string;
  name: string;
}

interface CreateInvoiceFormProps {
  contact?: ContactPreview;
  onClose: () => void;
}

interface SelectedService {
  serviceId: string;
  quantity: number;
}

interface CustomItem {
  key: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
}

const todayPlus = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export default function CreateInvoiceForm({ contact, onClose }: CreateInvoiceFormProps) {
  const isProduction = process.env.NODE_ENV === "production";
  const [createInvoice, { isLoading: isCreating }] = useCreateInvoiceMutation();
  const [generatePdf] = useGenerateInvoicePdfMutation();
  const [generatePdfProduction] = useGenerateInvoicePdfProductionMutation();
  const generateInvoicePdf = isProduction ? generatePdfProduction : generatePdf;
  const [isDownloading, setIsDownloading] = useState(false);

  const [selectedContact, setSelectedContact] = useState<ContactPreview | null>(contact || null);
  const [contactSearch, setContactSearch] = useState("");
  const { data: contactResults, isFetching: isSearchingContacts } = useGetContactsQuery(
    { page: 1, limit: 10, keyword: contactSearch },
    { skip: !!contact || contactSearch.trim().length < 2 }
  );

  const { data: serviceData, isLoading: isLoadingServices } = useGetServicesQuery({ page: 1, limit: 100, search: "" });
  const services = useMemo(() => serviceData?.services ?? [], [serviceData]);

  const [selectedServices, setSelectedServices] = useState<Record<string, SelectedService>>({});
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [dueDate, setDueDate] = useState(todayPlus(14));
  const [paymentTerms, setPaymentTerms] = useState("Net 14");
  const [notes, setNotes] = useState("");
  const [discountType, setDiscountType] = useState<"flat" | "percent">("percent");
  const [discountValue, setDiscountValue] = useState("");

  const selectedServiceItems = useMemo(() => Object.values(selectedServices), [selectedServices]);

  const onToggleService = (serviceId: string, checked: boolean) => {
    setSelectedServices((prev) => {
      const next = { ...prev };
      if (!checked) delete next[serviceId];
      else next[serviceId] = next[serviceId] || { serviceId, quantity: 1 };
      return next;
    });
  };

  const onQuantityChange = (serviceId: string, value: string) => {
    const parsed = Math.max(1, Number(value || 1));
    setSelectedServices((prev) => ({
      ...prev,
      [serviceId]: { serviceId, quantity: Number.isNaN(parsed) ? 1 : parsed },
    }));
  };

  const addCustomItem = () => {
    setCustomItems((prev) => [
      ...prev,
      { key: `custom-${Date.now()}`, name: "", description: "", quantity: 1, unitPrice: 0, taxPercent: 0 },
    ]);
  };

  const updateCustomItem = (key: string, field: keyof CustomItem, value: string) => {
    setCustomItems((prev) =>
      prev.map((item) =>
        item.key === key
          ? {
              ...item,
              [field]: field === "name" || field === "description" ? value : Number(value || 0),
            }
          : item
      )
    );
  };

  const removeCustomItem = (key: string) => setCustomItems((prev) => prev.filter((item) => item.key !== key));

  // Client-side preview only — the server recomputes authoritatively.
  const preview = useMemo(() => {
    const serviceLines = selectedServiceItems.map((item) => {
      const service = services.find((s) => s.id === item.serviceId);
      const amount = (service?.price || 0) * item.quantity;
      const taxAmount = (amount * (service?.taxPercent || 0)) / 100;
      return amount + taxAmount;
    });
    const customLines = customItems.map((item) => {
      const amount = item.unitPrice * item.quantity;
      const taxAmount = (amount * item.taxPercent) / 100;
      return amount + taxAmount;
    });
    const subtotal = [...serviceLines, ...customLines].reduce((sum, v) => sum + v, 0);
    const discountAmount = discountValue
      ? discountType === "percent"
        ? (subtotal * Number(discountValue)) / 100
        : Number(discountValue)
      : 0;
    return Math.max(0, subtotal - discountAmount);
  }, [selectedServiceItems, customItems, services, discountType, discountValue]);

  const handleDownload = async (invoiceId: string) => {
    setIsDownloading(true);
    try {
      const response = await generateInvoicePdf(invoiceId).unwrap();
      const url = window.URL.createObjectURL(response.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = response.filename || "invoice.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to download invoice");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent | undefined, downloadAfter: boolean) => {
    e?.preventDefault();

    if (!selectedContact) {
      toast.error("Please select a contact");
      return;
    }

    if (selectedServiceItems.length === 0 && customItems.length === 0) {
      toast.error("Add at least one service or custom line item");
      return;
    }

    const badCustom = customItems.find((item) => !item.name.trim() || item.quantity <= 0 || item.unitPrice < 0);
    if (badCustom) {
      toast.error("Every custom item needs a name, quantity > 0, and a non-negative price");
      return;
    }

    try {
      const invoice = await createInvoice({
        contactId: selectedContact._id,
        serviceItems: selectedServiceItems,
        customItems: customItems.map(({ name, description, quantity, unitPrice, taxPercent }) => ({
          name: name.trim(),
          description,
          quantity,
          unitPrice,
          taxPercent,
        })),
        dueDate,
        paymentTerms: paymentTerms.trim() || undefined,
        notes: notes.trim() || undefined,
        discount: discountValue ? { type: discountType, value: Number(discountValue) } : undefined,
      }).unwrap();

      toast.success("Invoice created");

      if (downloadAfter) {
        await handleDownload(invoice.id);
      }

      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to create invoice");
    }
  };

  const isSubmitting = isCreating || isDownloading;

  return (
    <div>
      <h2 className="mb-5 font-semibold text-gray-800 text-theme-xl dark:text-white/90 lg:text-2xl">Create Invoice</h2>
      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Contact</label>
          {contact ? (
            <div className="h-11 flex items-center rounded-md border border-gray-200 bg-gray-50 px-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {contact.name}
            </div>
          ) : selectedContact ? (
            <div className="flex h-11 items-center justify-between rounded-md border border-gray-300 px-4 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
              <span>{selectedContact.name}</span>
              <button
                type="button"
                onClick={() => setSelectedContact(null)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search contact by name..."
                className="h-11 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              {contactSearch.trim().length >= 2 && (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  {isSearchingContacts ? (
                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Searching...</div>
                  ) : contactResults?.contacts.length ? (
                    contactResults.contacts.map((c: any) => (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => {
                          setSelectedContact({ _id: c._id, name: c.name });
                          setContactSearch("");
                        }}
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        <div>{c.name}</div>
                        {c.email && <div className="text-xs text-gray-500 dark:text-gray-400">{c.email}</div>}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No contacts found</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-11 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Payment Terms</label>
            <input
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="h-11 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Services</label>
          <div className="max-h-56 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700">
            {isLoadingServices ? (
              <div className="flex justify-center py-6">
                <ShortSpinnerDark />
              </div>
            ) : services.length === 0 ? (
              <p className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">No services available.</p>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {services.map((service) => {
                  const isChecked = Boolean(selectedServices[service.id]);
                  return (
                    <label key={service.id} className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => onToggleService(service.id, e.target.checked)}
                          className="mt-1"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{service.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {service.currency} {service.price} (tax {service.taxPercent || 0}%)
                          </p>
                        </div>
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={selectedServices[service.id]?.quantity ?? 1}
                        disabled={!isChecked}
                        onChange={(e) => onQuantityChange(service.id, e.target.value)}
                        className="h-9 w-20 rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400">Custom Line Items</label>
            <button type="button" onClick={addCustomItem} className="text-xs font-medium text-brand-500 hover:text-brand-600">
              + Add item
            </button>
          </div>
          {customItems.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                <span className="col-span-4">Name</span>
                <span className="col-span-3">Description</span>
                <span className="col-span-1">Qty</span>
                <span className="col-span-2">Price</span>
                <span className="col-span-1">Tax %</span>
                <span className="col-span-1"></span>
              </div>
              {customItems.map((item) => (
                <div key={item.key} className="grid grid-cols-12 gap-2 rounded-md border border-gray-200 p-2 dark:border-gray-700">
                  <input
                    placeholder="Name"
                    value={item.name}
                    onChange={(e) => updateCustomItem(item.key, "name", e.target.value)}
                    className="col-span-4 h-9 rounded-md border border-gray-300 px-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateCustomItem(item.key, "description", e.target.value)}
                    className="col-span-3 h-9 rounded-md border border-gray-300 px-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateCustomItem(item.key, "quantity", e.target.value)}
                    className="col-span-1 h-9 rounded-md border border-gray-300 px-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Price"
                    value={item.unitPrice}
                    onChange={(e) => updateCustomItem(item.key, "unitPrice", e.target.value)}
                    className="col-span-2 h-9 rounded-md border border-gray-300 px-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Tax %"
                    value={item.taxPercent}
                    onChange={(e) => updateCustomItem(item.key, "taxPercent", e.target.value)}
                    className="col-span-1 h-9 rounded-md border border-gray-300 px-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => removeCustomItem(item.key)}
                    className="col-span-1 flex h-9 items-center justify-center text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Discount Type</label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as "flat" | "percent")}
              className="h-11 w-full rounded-md border border-gray-300 bg-transparent px-3 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="percent">Percent</option>
              <option value="flat">Flat amount</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Discount Value</label>
            <input
              type="number"
              min="0"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="h-11 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-end justify-end">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Estimated total: <span className="font-semibold text-gray-800 dark:text-white">{preview.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="outline" disabled={isSubmitting}>
            {isCreating ? <ShortSpinnerDark /> : "Save Draft"}
          </Button>
          <Button type="button" variant="primary" disabled={isSubmitting} onClick={() => handleSubmit(undefined, true)}>
            {isDownloading ? <ShortSpinnerDark /> : "Save & Download PDF"}
          </Button>
        </div>
      </form>
    </div>
  );
}
