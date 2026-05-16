import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import LeaveHeader from "@/components/page-components/LeaveHeader";
import LeavesTableOne from "@/components/tables/LeavesTableOne";
//import PipelineTableOne from "@/components/tables/PipelineTableOne";
import { Metadata } from "next";
import React from "react";
import { getAppMetaTitle } from "@/app/lib/utils/metadata";

export const metadata: Metadata = {
  title: getAppMetaTitle("Qoncept CRM"),
  description:"",
};

export default function Pipelines() {
  return (
    <div>
      <PageBreadcrumb pageTitle="leaves"/>
      <LeaveHeader/>
      <div className="space-y-6">
          <LeavesTableOne />
      </div>
    </div>
  );
}
