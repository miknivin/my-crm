/* eslint-disable @typescript-eslint/no-explicit-any */
import { IInvoiceDiscount, IInvoiceItem, InvoiceStatus } from "@/app/models/Invoice";

export interface InvoiceItemInput {
  serviceId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxPercent?: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Resolves a raw line item input into its priced form (amount/tax/total). */
export function priceInvoiceItem(input: InvoiceItemInput): IInvoiceItem {
  const quantity = Number(input.quantity);
  const unitPrice = Number(input.unitPrice);
  const taxPercent = Number(input.taxPercent || 0);
  const amount = round2(quantity * unitPrice);
  const taxAmount = round2((amount * taxPercent) / 100);

  return {
    serviceId: input.serviceId as any,
    name: input.name,
    description: input.description || "",
    quantity,
    unitPrice,
    taxPercent,
    amount,
    taxAmount,
    total: round2(amount + taxAmount),
  };
}

export interface DiscountInput {
  type: "flat" | "percent";
  value: number;
}

/** Resolves a discount input against a subtotal into its concrete amount. */
export function resolveDiscount(subtotal: number, discount?: DiscountInput): IInvoiceDiscount | undefined {
  if (!discount || !discount.value) return undefined;
  const amount =
    discount.type === "percent" ? round2((subtotal * discount.value) / 100) : round2(discount.value);
  return { type: discount.type, value: discount.value, amount: Math.min(amount, subtotal) };
}

export interface InvoiceTotals {
  subtotal: number;
  taxTotal: number;
  discount?: IInvoiceDiscount;
  total: number;
}

export function computeInvoiceTotals(items: IInvoiceItem[], discountInput?: DiscountInput): InvoiceTotals {
  const subtotal = round2(items.reduce((sum, item) => sum + item.amount, 0));
  const taxTotal = round2(items.reduce((sum, item) => sum + item.taxAmount, 0));
  const discount = resolveDiscount(subtotal, discountInput);
  const total = round2(subtotal - (discount?.amount || 0) + taxTotal);

  return { subtotal, taxTotal, discount, total };
}

/** Derives status + balanceDue from the current total and amount paid. */
export function resolvePaymentState(
  total: number,
  amountPaid: number,
  currentStatus: InvoiceStatus
): { status: InvoiceStatus; balanceDue: number } {
  const safeAmountPaid = Math.max(0, round2(amountPaid));
  const balanceDue = Math.max(0, round2(total - safeAmountPaid));

  if (currentStatus === "cancelled") return { status: "cancelled", balanceDue: round2(total) };
  if (safeAmountPaid >= total && total > 0) return { status: "paid", balanceDue: 0 };
  if (safeAmountPaid > 0) return { status: "partially_paid", balanceDue };
  // No payment yet — keep draft/sent as-is instead of forcing a downgrade.
  return { status: currentStatus === "paid" || currentStatus === "partially_paid" ? "sent" : currentStatus, balanceDue };
}
