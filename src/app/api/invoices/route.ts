/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import dbConnect from "@/app/lib/db/connection";
import { authorizeRoles, isAuthenticatedUser } from "@/app/api/middlewares/auth";
import Contact from "@/app/models/Contact";
import Service from "@/app/models/Service";
import Invoice from "@/app/models/Invoice";
import CompanySettings, { COMPANY_SETTINGS_ID } from "@/app/models/CompanySettings";
import { getNextInvoiceSequence } from "@/app/models/InvoiceCounter";
import {
  computeInvoiceTotals,
  priceInvoiceItem,
  resolvePaymentState,
  InvoiceItemInput,
} from "@/helpers/invoiceCalculations";

interface CustomItemInput {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxPercent?: number;
}

interface ServiceItemInput {
  serviceId: string;
  quantity: number;
  taxPercent?: number;
}

interface CreateInvoiceBody {
  contactId: string;
  serviceItems?: ServiceItemInput[];
  customItems?: CustomItemInput[];
  dueDate: string;
  issueDate?: string;
  paymentTerms?: string;
  notes?: string;
  discount?: { type: "flat" | "percent"; value: number };
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    await isAuthenticatedUser(req);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (status) query.status = status;
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [{ invoiceNumber: searchRegex }, { "contactSnapshot.name": searchRegex }];
    }

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);

    return NextResponse.json(
      {
        message: "Invoices fetched successfully",
        data: { invoices, page, limit, total, totalPages: Math.ceil(total / limit) },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ message: error.message || "Failed to fetch invoices" }, { status: error.status || 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const user = await isAuthenticatedUser(req);
    authorizeRoles(user, "admin", "team_member");

    const body = (await req.json()) as CreateInvoiceBody;
    const { contactId, serviceItems = [], customItems = [], dueDate, issueDate, paymentTerms, notes, discount } = body;

    if (!contactId || !Types.ObjectId.isValid(contactId)) {
      return NextResponse.json({ message: "Invalid contactId" }, { status: 400 });
    }

    if (serviceItems.length === 0 && customItems.length === 0) {
      return NextResponse.json({ message: "At least one line item is required" }, { status: 400 });
    }

    if (!dueDate || Number.isNaN(new Date(dueDate).getTime())) {
      return NextResponse.json({ message: "A valid dueDate is required" }, { status: 400 });
    }

    const contact = await Contact.findById(contactId).lean();
    if (!contact) {
      return NextResponse.json({ message: "Contact not found" }, { status: 404 });
    }

    const badServiceItem = serviceItems.find(
      (item) => !item.serviceId || !Types.ObjectId.isValid(item.serviceId) || Number(item.quantity) <= 0
    );
    if (badServiceItem) {
      return NextResponse.json(
        { message: "Each service item needs a valid serviceId and quantity greater than zero" },
        { status: 400 }
      );
    }

    const badCustomItem = customItems.find(
      (item) => !item.name?.trim() || Number(item.quantity) <= 0 || Number(item.unitPrice) < 0
    );
    if (badCustomItem) {
      return NextResponse.json(
        { message: "Each custom item needs a name, quantity greater than zero and a non-negative price" },
        { status: 400 }
      );
    }

    const serviceIds = serviceItems.map((item) => new Types.ObjectId(item.serviceId));
    const services = await Service.find({ _id: { $in: serviceIds } });
    const serviceMap = new Map(services.map((service) => [service._id.toString(), service]));

    if (services.length !== serviceItems.length) {
      return NextResponse.json({ message: "One or more services were not found" }, { status: 404 });
    }

    let currency: "INR" | "USD" | "EUR" | "GBP" = "INR";

    const itemInputs: InvoiceItemInput[] = [
      ...serviceItems.map((item) => {
        const service = serviceMap.get(item.serviceId)!;
        currency = service.currency || currency;
        return {
          serviceId: item.serviceId,
          name: service.name,
          description: service.description || "",
          quantity: Number(item.quantity),
          unitPrice: Number(service.price || 0),
          taxPercent: item.taxPercent ?? service.taxPercent ?? 0,
        };
      }),
      ...customItems.map((item) => ({
        name: item.name.trim(),
        description: item.description || "",
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        taxPercent: item.taxPercent ?? 0,
      })),
    ];

    const items = itemInputs.map(priceInvoiceItem);
    const { subtotal, taxTotal, discount: resolvedDiscount, total } = computeInvoiceTotals(items, discount);
    const { status, balanceDue } = resolvePaymentState(total, 0, "draft");

    const companySettings = await CompanySettings.findById(COMPANY_SETTINGS_ID).lean();
    const seq = await getNextInvoiceSequence();
    const prefix = (companySettings as any)?.invoicePrefix || "INV";
    const invoiceNumber = `${prefix}-${String(seq).padStart(5, "0")}`;

    const invoice = await Invoice.create({
      invoiceNumber,
      contactId: new Types.ObjectId(contactId),
      createdBy: new Types.ObjectId(user._id),
      status,
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      dueDate: new Date(dueDate),
      items,
      currency,
      subtotal,
      taxTotal,
      discount: resolvedDiscount,
      total,
      amountPaid: 0,
      balanceDue,
      paymentTerms: paymentTerms || "",
      notes: notes || (companySettings as any)?.invoiceNotes || "",
      contactSnapshot: {
        name: (contact as any).name,
        email: (contact as any).email,
        phone: (contact as any).phone,
        businessName: (contact as any).businessName || "",
      },
    });

    return NextResponse.json({ message: "Invoice created successfully", data: invoice }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating invoice:", error);
    if (error.message === "Not allowed") {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json({ message: error.message || "Failed to create invoice" }, { status: 500 });
  }
}
