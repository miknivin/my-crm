/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import Button from "@/components/ui/button/Button";
import ShortSpinnerDark from "@/components/ui/loaders/ShortSpinnerDark";
import { useGetServicesQuery } from "@/app/redux/api/serviceApi";
import {
  useGenerateProposalMutation,
  useGenerateProposalProductionMutation,
} from "@/app/redux/api/proposalApi";

interface ContactPreview {
  _id: string;
  name: string;
}

interface GenerateProposalModalProps {
  contact: ContactPreview;
  onClose: () => void;
}

interface SelectedService {
  serviceId: string;
  quantity: number;
}

export default function GenerateProposalForm({ contact, onClose }: GenerateProposalModalProps) {
  // Dynamically choose the mutation based on environment
  const isProduction = process.env.NODE_ENV === "production";

  const useGenerateMutation = isProduction
    ? useGenerateProposalProductionMutation
    : useGenerateProposalMutation;

  const [generateProposal, { isLoading: isGenerating }] = useGenerateMutation();

  const { data, isLoading: isLoadingServices } = useGetServicesQuery({
    page: 1,
    limit: 100,
    search: "",
  });

  const [proposalTitle, setProposalTitle] = useState("Service Proposal");
  const [preparedFor, setPreparedFor] = useState(contact.name || "");
  const [advanceAmount, setAdvanceAmount] = useState<string>("");
  const [selected, setSelected] = useState<Record<string, SelectedService>>({});

  const services = data?.services ?? [];
  const selectedItems = useMemo(() => Object.values(selected), [selected]);

  const onToggleService = (serviceId: string, checked: boolean) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (!checked) {
        delete next[serviceId];
      } else {
        next[serviceId] = next[serviceId] || { serviceId, quantity: 1 };
      }
      return next;
    });
  };

  const onQuantityChange = (serviceId: string, value: string) => {
    const parsed = Math.max(1, Number(value || 1));
    setSelected((prev) => ({
      ...prev,
      [serviceId]: {
        serviceId,
        quantity: Number.isNaN(parsed) ? 1 : parsed,
      },
    }));
  };

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedItems.length) {
      toast.error("Please select at least one service");
      return;
    }

    try {
      const response = await generateProposal({
        contactId: contact._id,
        items: selectedItems,
        proposalTitle: proposalTitle.trim() || undefined,
        preparedFor: preparedFor.trim() || undefined,
        advanceAmount: advanceAmount ? Number(advanceAmount) : undefined,
      }).unwrap();

      const url = window.URL.createObjectURL(response.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = response.filename || "proposal.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Proposal generated and downloaded");
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to generate proposal");
    }
  };

  return (
    <div>
      <h2 className="mb-5 font-semibold text-gray-800 text-theme-xl dark:text-white/90 lg:text-2xl">
        Generate Proposal
      </h2>
      <form onSubmit={handleDownload} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Proposal Title
            </label>
            <input
              value={proposalTitle}
              onChange={(e) => setProposalTitle(e.target.value)}
              className="h-11 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Prepared For
            </label>
            <input
              value={preparedFor}
              onChange={(e) => setPreparedFor(e.target.value)}
              className="h-11 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Advance Amount (optional)
          </label>
          <input
            type="number"
            min="0"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(e.target.value)}
            className="h-11 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Services
          </label>
          <div className="max-h-72 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700">
            {isLoadingServices ? (
              <div className="flex justify-center py-6">
                <ShortSpinnerDark />
              </div>
            ) : services.length === 0 ? (
              <p className="px-4 py-4 text-sm text-gray-500">No services available.</p>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {services.map((service) => {
                  const isChecked = Boolean(selected[service.id]);
                  return (
                    <label
                      key={service.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => onToggleService(service.id, e.target.checked)}
                          className="mt-1"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {service.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {service.currency} {service.price} ({service.billingType})
                          </p>
                        </div>
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={selected[service.id]?.quantity ?? 1}
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

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isGenerating}>
            {isGenerating ? <ShortSpinnerDark /> : "Generate & Download"}
          </Button>
        </div>
      </form>
    </div>
  );
}