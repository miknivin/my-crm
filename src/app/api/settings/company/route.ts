/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/app/lib/db/connection";
import CompanySettings, { COMPANY_SETTINGS_ID } from "@/app/models/CompanySettings";
import { authorizeRoles, isAuthenticatedUser } from "@/app/api/middlewares/auth";

interface UpdateCompanySettingsBody {
  companyName?: string;
  logo?: { public_id: string; url: string };
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  taxId?: string;
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
    upiId?: string;
  };
  invoicePrefix?: string;
  invoiceNotes?: string;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    await isAuthenticatedUser(req);

    const settings = await CompanySettings.findById(COMPANY_SETTINGS_ID).lean();

    return NextResponse.json(
      { message: "Company settings fetched successfully", data: settings || null },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching company settings:", error);
    if (error.message?.includes("login") || error.message?.includes("not found")) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    return NextResponse.json({ message: error.message || "Failed to fetch company settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const user = await isAuthenticatedUser(req);
    authorizeRoles(user, "admin");

    const body = (await req.json()) as UpdateCompanySettingsBody;

    if (body.invoicePrefix !== undefined && !body.invoicePrefix.trim()) {
      return NextResponse.json({ message: "Invoice prefix cannot be empty" }, { status: 400 });
    }

    const updated = await CompanySettings.findByIdAndUpdate(
      COMPANY_SETTINGS_ID,
      { $set: body },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json(
      { message: "Company settings updated successfully", data: updated },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating company settings:", error);
    if (error.message === "Not allowed") {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json({ message: error.message || "Failed to update company settings" }, { status: 500 });
  }
}
