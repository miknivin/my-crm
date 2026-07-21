import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import InvoicesHeader from '@/components/page-components/InvoicesHeader';
import InvoicesTableOne from '@/components/tables/InvoicesTableOne';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Qoncept CRM',
  description: '',
};

export default function InvoicesPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="invoices" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <InvoicesHeader />
        <div className="space-y-6">
          <InvoicesTableOne />
        </div>
      </div>
    </div>
  );
}
