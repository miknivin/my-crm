import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import UserHeader from "@/components/page-components/UsersHeader";
import UsersTableOne from "@/components/tables/UsersTable";
import { Metadata } from "next";
import React from "react";
import { getAppMetaTitle } from "@/app/lib/utils/metadata";

export const metadata: Metadata = {
  title: getAppMetaTitle("Qoncept CRM"),
  description:"",
};

export default function Users() {
  return (
    <div>
      <PageBreadcrumb pageTitle="users"/>
      <UserHeader/>
      <div className="space-y-6">
          <UsersTableOne />
      </div>
    </div>
  );
}
