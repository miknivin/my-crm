import React from "react";
import Badge from "@/components/ui/badge/Badge";
import { InvoiceStatus } from "@/app/redux/api/invoiceApi";

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: "light" | "info" | "warning" | "success" | "error" }> = {
  draft: { label: "Draft", color: "light" },
  sent: { label: "Sent", color: "info" },
  partially_paid: { label: "Partially Paid", color: "warning" },
  paid: { label: "Paid", color: "success" },
  cancelled: { label: "Cancelled", color: "error" },
};

export default function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <Badge variant="light" color={config.color}>
      {config.label}
    </Badge>
  );
}
