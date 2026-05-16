import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import ServicesHeader from '@/components/page-components/ServicesHeader';
import ServicesTableOne from '@/components/tables/ServicesTableOne';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Qoncept CRM',
  description: '',
};

export default function Services() {
  return (
    <div>
      <PageBreadcrumb pageTitle="services" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <ServicesHeader />
        <div className="space-y-6">
          <ServicesTableOne />
        </div>
      </div>
    </div>
  );
}

