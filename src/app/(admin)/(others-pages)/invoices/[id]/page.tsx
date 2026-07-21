import { Metadata } from "next";
import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import InvoiceDetailView from "@/components/page-components/InvoiceDetailView";

export const metadata: Metadata = {
  title: "Qoncept CRM",
  description: "",
};

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div>
      <PageBreadcrumb pageTitle="invoice" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <InvoiceDetailView invoiceId={id} />
      </div>
    </div>
  );
}
