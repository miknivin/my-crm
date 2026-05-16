import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ContactsHeader from "@/components/page-components/ContactsHeader";
import ContactTableOne from "@/components/tables/ContactTableOne";

// import UserAddressCard from "@/components/user-profile/UserAddressCard";
// import UserInfoCard from "@/components/user-profile/UserInfoCard";
// import UserMetaCard from "@/components/user-profile/UserMetaCard";
import { Metadata } from "next";
import React from "react";
import { getAppMetaTitle } from "@/app/lib/utils/metadata";

export const metadata: Metadata = {
  title: getAppMetaTitle("Qoncept CRM"),
  description:
    "",
};

export default function Contacts() {
  return (
    <div>
      <PageBreadcrumb pageTitle="contacts"/>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <ContactsHeader/>
        <div className="space-y-6">
          <ContactTableOne/>
        </div>
      </div>
    </div>
  );
}
