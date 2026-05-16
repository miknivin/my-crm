import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PipelineBody from "@/components/pipeline";
import { Metadata } from "next";
import React from "react";
import mongoose from "mongoose";
import { notFound } from "next/navigation";
import { getAppMetaTitle } from "@/app/lib/utils/metadata";

export const metadata: Metadata = {
  title: 
    process.env.NEXT_PUBLIC_TEST_MODE === "true"
      ? getAppMetaTitle("Qoncept CRM")
      : process.env.NODE_ENV === 'development' 
        ? 'connect-e CRM' 
        : 'Qoncept CRM',
  description: "View and manage your CRM pipelines",
};

export default async function Pipelines({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; 

  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Pipelines" />
      <PipelineBody pipelineId={id} />
    </div>
  );
}
