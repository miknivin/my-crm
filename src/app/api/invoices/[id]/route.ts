/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import dbConnect from "@/app/lib/db/connection";
import { authorizeRoles, isAuthenticatedUser } from "@/app/api/middlewares/auth";
import Invoice from "@/app/models/Invoice";
import { computeInvoiceTotals, resolvePaymentState } from "@/helpers/invoiceCalculations";

interface UpdateInvoiceBody {
  dueDate?: string;
  paymentTerms?: string;
  notes?: string;
  status?: "sent" | "cancelled"; // manual, non-payment-derived transitions
  amountPaid?: number; // recording a payment
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    await isAuthenticatedUser(req);

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid invoice ID" }, { status: 400 });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Invoice fetched successfully", data: invoice }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json({ message: error.message || "Failed to fetch invoice" }, { status: error.status || 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const user = await isAuthenticatedUser(req);
    authorizeRoles(user, "admin", "team_member");

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid invoice ID" }, { status: 400 });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }

    const body = (await req.json()) as UpdateInvoiceBody;

    if (body.dueDate !== undefined) {
      if (Number.isNaN(new Date(body.dueDate).getTime())) {
        return NextResponse.json({ message: "Invalid dueDate" }, { status: 400 });
      }
      invoice.dueDate = new Date(body.dueDate);
    }

    if (body.paymentTerms !== undefined) invoice.paymentTerms = body.paymentTerms;
    if (body.notes !== undefined) invoice.notes = body.notes;

    if (body.status === "cancelled") {
      invoice.status = "cancelled";
    } else if (body.status === "sent" && invoice.status === "draft") {
      invoice.status = "sent";
    }

    if (body.amountPaid !== undefined) {
      if (Number.isNaN(Number(body.amountPaid)) || Number(body.amountPaid) < 0) {
        return NextResponse.json({ message: "amountPaid must be a non-negative number" }, { status: 400 });
      }
      invoice.amountPaid = Number(body.amountPaid);
    }

    // Recompute totals/status/balance from current items + amountPaid so
    // the stored figures are always internally consistent, regardless of
    // which fields were touched in this request.
    const { subtotal, taxTotal, total } = computeInvoiceTotals(invoice.items, invoice.discount);
    invoice.subtotal = subtotal;
    invoice.taxTotal = taxTotal;
    invoice.total = total;

    const { status, balanceDue } = resolvePaymentState(total, invoice.amountPaid, invoice.status);
    invoice.status = status;
    invoice.balanceDue = balanceDue;

    await invoice.save();

    return NextResponse.json({ message: "Invoice updated successfully", data: invoice }, { status: 200 });
  } catch (error: any) {
    console.error("Error updating invoice:", error);
    if (error.message === "Not allowed") {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json({ message: error.message || "Failed to update invoice" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const user = await isAuthenticatedUser(req);
    authorizeRoles(user, "admin", "team_member");

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid invoice ID" }, { status: 400 });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status !== "draft") {
      return NextResponse.json({ message: "Only draft invoices can be deleted" }, { status: 409 });
    }

    await invoice.deleteOne();

    return NextResponse.json({ message: "Invoice deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting invoice:", error);
    if (error.message === "Not allowed") {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json({ message: error.message || "Failed to delete invoice" }, { status: 500 });
  }
}
