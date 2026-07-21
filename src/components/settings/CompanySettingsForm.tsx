/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  useGetCompanySettingsQuery,
  useUpdateCompanySettingsMutation,
  ICompanySettings,
} from "@/app/redux/api/settingsApi";
import Button from "@/components/ui/button/Button";
import ShortSpinnerDark from "@/components/ui/loaders/ShortSpinnerDark";
import ImageUploadField from "./ImageUploadField";

const EMPTY_SETTINGS: ICompanySettings = {
  companyName: "",
  address: "",
  email: "",
  phone: "",
  website: "",
  taxId: "",
  bankDetails: { accountName: "", accountNumber: "", ifsc: "", bankName: "", upiId: "" },
  invoicePrefix: "INV",
  invoiceNotes: "",
};

export default function CompanySettingsForm() {
  const { data, isLoading: isFetching } = useGetCompanySettingsQuery();
  const [updateCompanySettings, { isLoading: isSaving }] = useUpdateCompanySettingsMutation();

  const [form, setForm] = useState<ICompanySettings>(EMPTY_SETTINGS);

  useEffect(() => {
    if (data) setForm({ ...EMPTY_SETTINGS, ...data, bankDetails: { ...EMPTY_SETTINGS.bankDetails, ...data.bankDetails } });
  }, [data]);

  const setField = <K extends keyof ICompanySettings>(key: K, value: ICompanySettings[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setBankField = (key: keyof NonNullable<ICompanySettings["bankDetails"]>, value: string) =>
    setForm((prev) => ({ ...prev, bankDetails: { ...prev.bankDetails, [key]: value } }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }

    try {
      await updateCompanySettings(form).unwrap();
      toast.success("Company settings updated");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update company settings");
    }
  };

  if (isFetching) {
    return (
      <div className="flex justify-center py-10">
        <ShortSpinnerDark />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <ImageUploadField
        label="Company logo"
        folder="logos"
        currentUrl={form.logo?.url}
        onUploaded={({ url, key }) => setField("logo", { url, public_id: key })}
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Company name</label>
        <input
          value={form.companyName}
          onChange={(e) => setField("companyName", e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          required
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Address</label>
        <textarea
          value={form.address}
          onChange={(e) => setField("address", e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Email</label>
          <input
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Phone</label>
          <input
            value={form.phone}
            onChange={(e) => setField("phone", e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Website</label>
          <input
            value={form.website}
            onChange={(e) => setField("website", e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Tax / GST ID</label>
          <input
            value={form.taxId}
            onChange={(e) => setField("taxId", e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">Bank / UPI details</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Account name</label>
            <input
              value={form.bankDetails?.accountName || ""}
              onChange={(e) => setBankField("accountName", e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Account number</label>
            <input
              value={form.bankDetails?.accountNumber || ""}
              onChange={(e) => setBankField("accountNumber", e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">IFSC</label>
            <input
              value={form.bankDetails?.ifsc || ""}
              onChange={(e) => setBankField("ifsc", e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Bank name</label>
            <input
              value={form.bankDetails?.bankName || ""}
              onChange={(e) => setBankField("bankName", e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">UPI ID</label>
            <input
              value={form.bankDetails?.upiId || ""}
              onChange={(e) => setBankField("upiId", e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Invoice number prefix</label>
          <input
            value={form.invoicePrefix}
            onChange={(e) => setField("invoicePrefix", e.target.value)}
            placeholder="INV"
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
          Default invoice notes / terms
        </label>
        <textarea
          value={form.invoiceNotes}
          onChange={(e) => setField("invoiceNotes", e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={isSaving}>
          {isSaving ? <ShortSpinnerDark /> : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
