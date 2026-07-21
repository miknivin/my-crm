import { IInvoice } from "@/app/models/Invoice";
import { ICompanySettings } from "@/app/models/CompanySettings";

const currencySymbols: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

const formatDate = (value: Date) =>
  new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  partially_paid: "Partially Paid",
  cancelled: "Cancelled",
};

/** Builds the EJS render payload shared by both invoice PDF routes. */
export function buildInvoiceRenderPayload(invoice: IInvoice, company: ICompanySettings | null) {
  const currencySymbol = currencySymbols[invoice.currency] || invoice.currency;

  return {
    company: {
      name: company?.companyName || "",
      logoUrl: company?.logo?.url || "",
      address: company?.address || "",
      email: company?.email || "",
      phone: company?.phone || "",
      website: company?.website || "",
      taxId: company?.taxId || "",
      bankDetails: company?.bankDetails || {},
    },
    invoiceNumber: invoice.invoiceNumber,
    statusLabel: STATUS_LABELS[invoice.status] || invoice.status,
    isPaid: invoice.status === "paid",
    isCancelled: invoice.status === "cancelled",
    issueDate: formatDate(invoice.issueDate),
    dueDate: formatDate(invoice.dueDate),
    billTo: invoice.contactSnapshot,
    items: invoice.items.map((item) => ({
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxPercent: item.taxPercent,
      amount: item.amount,
      total: item.total,
    })),
    currencySymbol,
    subtotal: invoice.subtotal,
    discount: invoice.discount,
    taxTotal: invoice.taxTotal,
    total: invoice.total,
    amountPaid: invoice.amountPaid,
    balanceDue: invoice.balanceDue,
    paymentTerms: invoice.paymentTerms || "",
    notes: invoice.notes || "",
  };
}
