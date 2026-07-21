import { InvoiceStatus } from "@/app/redux/api/invoiceApi";

/**
 * "Overdue" is deliberately not a persisted status (would need a cron job
 * to keep it current) — it's derived at read time from dueDate + status.
 */
export function isInvoiceOverdue(dueDate: string, status: InvoiceStatus): boolean {
  if (status !== "sent" && status !== "partially_paid") return false;
  return new Date(dueDate).getTime() < Date.now();
}
