/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { Types } from "mongoose";
import ejs from "ejs";

import dbConnect from "@/app/lib/db/connection";
import { isAuthenticatedUser } from "@/app/api/middlewares/auth";
import Invoice from "@/app/models/Invoice";
import CompanySettings, { COMPANY_SETTINGS_ID } from "@/app/models/CompanySettings";
import { buildInvoiceRenderPayload } from "@/helpers/buildInvoiceRenderPayload";
import { renderHtmlToPdf } from "@/app/lib/pdf/launchPdfBrowser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sanitizeFilePart = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "invoice";

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

    const company = await CompanySettings.findById(COMPANY_SETTINGS_ID).lean();
    const payload = buildInvoiceRenderPayload(invoice, company as any);

    const templatePath = path.join(process.cwd(), "src", "app", "lib", "templates", "invoice.ejs");
    const template = await readFile(templatePath, "utf-8");
    const html = ejs.render(template, { data: payload });

    const pdfBuffer = await renderHtmlToPdf(html, false);

    const fileName = `${sanitizeFilePart(invoice.contactSnapshot.name)}-${invoice.invoiceNumber}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Error generating invoice PDF:", error);
    return NextResponse.json({ message: error.message || "Failed to generate invoice PDF" }, { status: error.status || 500 });
  }
}
