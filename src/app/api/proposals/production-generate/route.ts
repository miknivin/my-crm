/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { Types } from "mongoose";
import ejs from "ejs";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

import dbConnect from "@/app/lib/db/connection";
import { authorizeRoles, isAuthenticatedUser } from "@/app/api/middlewares/auth";
import Contact from "@/app/models/Contact";
import Service from "@/app/models/Service";
import Proposal from "@/app/models/Proposal";

export const dynamic = "force-dynamic";

interface ProposalItemInput {
  serviceId: string;
  quantity: number;
}

interface GenerateProposalBody {
  contactId: string;
  items: ProposalItemInput[];
  proposalTitle?: string;
  preparedFor?: string;
  advanceAmount?: number;
}



const currencySymbols: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "EUR ",
  GBP: "GBP ",
};

const sanitizeFilePart = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "proposal";

// const localImageToDataUri = async (absolutePath: string): Promise<string | null> => {
//   try {
//     const buffer = await readFile(absolutePath);
//     const ext = path.extname(absolutePath).toLowerCase();
//     const mime =
//       ext === ".png"
//         ? "image/png"
//         : ext === ".jpg" || ext === ".jpeg"
//         ? "image/jpeg"
//         : ext === ".webp"
//         ? "image/webp"
//         : "application/octet-stream";
//     return `data:${mime};base64,${buffer.toString("base64")}`;
//   } catch {
//     return null;
//   }
// };

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const user = await isAuthenticatedUser(req);
    authorizeRoles(user, "admin", "team_member");

    const body = (await req.json()) as GenerateProposalBody;
    const { contactId, items, proposalTitle, preparedFor, advanceAmount } = body;

    if (!contactId || !Types.ObjectId.isValid(contactId)) {
      return NextResponse.json({ message: "Invalid contactId" }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: "At least one service item is required" }, { status: 400 });
    }

    const badItem = items.find(
      (item) => !item.serviceId || !Types.ObjectId.isValid(item.serviceId) || Number(item.quantity) <= 0
    );
    if (badItem) {
      return NextResponse.json(
        { message: "Each item must have a valid serviceId and quantity greater than zero" },
        { status: 400 }
      );
    }

    // Removed .lean() → now returns full Mongoose document
    const contact = await Contact.findById(contactId);
    if (!contact) {
      return NextResponse.json({ message: "Contact not found" }, { status: 404 });
    }

    const serviceIds = items.map((item) => new Types.ObjectId(item.serviceId));
    const services = await Service.find({ _id: { $in: serviceIds } });

    // No need for LeanService interface anymore — services are now Mongoose docs
    const serviceMap = new Map<string, any>(
      services.map((service) => [service._id.toString(), service])
    );

    if (services.length !== items.length) {
      return NextResponse.json({ message: "One or more services were not found" }, { status: 404 });
    }

    const normalizedItems = items.map((item) => {
      const service = serviceMap.get(item.serviceId)!;
      const quantity = Number(item.quantity);
      const unitPrice = Number(service.price || 0);
      const amount = unitPrice * quantity;
      return {
        serviceId: service._id,
        serviceName: service.name,
        description: service.description || "",
        quantity,
        unitPrice,
        amount,
        currency: service.currency || "INR",
      };
    });

    const currency = normalizedItems[0].currency || "INR";
    const subtotal = normalizedItems.reduce((sum, item) => sum + item.amount, 0);
    const safeAdvance = Math.max(0, Math.min(Number(advanceAmount || 0), subtotal));
    const balance = subtotal - safeAdvance;

    const latestProposal = await Proposal.findOne({ contactId }).sort({ version: -1 }).select("version");
    const version = (latestProposal?.version || 0) + 1;
    const proposalNumber = `PRP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(version).padStart(3, "0")}`;


    const resolvedTitle = (proposalTitle || "Service Proposal").trim();
    const coverTitleWords = resolvedTitle.toUpperCase().split(/\s+/).filter(Boolean);
    const coverTitleLine1 = coverTitleWords[0] || "SERVICE";
    const coverTitleLine2 = coverTitleWords.slice(1).join(" ") || "PROPOSAL";

    const renderPayload = {
      brandName: "Qoncept",
      title: resolvedTitle,
      preparedFor: preparedFor || contact.name || "Client",
      coverTitleLine1,
      coverTitleLine2,
      sectionTagline: "HUB OF QUALITY CONCEPTS",
      pageFooterLabel: `+ ${resolvedTitle}`,
      aboutTitle: "ABOUT US",
      aboutText:
        "Welcome to Qoncept, your premier destination for comprehensive branding solutions in Kochi, Kerala. We are dedicated to helping our clients achieve remarkable business growth through innovative and creative brand development.",
      passionTitle: "OUR PASSION",
      passionText:
        "At Qoncept, we are a passionate team of brand experts, graphic designers, and digital strategists dedicated to crafting compelling brand identities. We thrive on inspiring and empowering businesses to leave a lasting impression in today's competitive landscape.",
      expertiseTitle: "OUR EXPERTISE",
      expertiseSubtitle: "We specialize in a wide range of branding services, including",
      expertiseHighlightTitle: "PROPOSAL SUMMARY",
      expertiseHighlightText: `Proposal No: ${proposalNumber}`,
      expertiseCards: normalizedItems.slice(0, 6).map((item) => ({
        title: item.serviceName,
        description: item.description || `Qty: ${item.quantity}`,
      })),
      services: normalizedItems.map((item) => ({
        title: `${item.serviceName} x (${item.quantity})`,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      paymentTerms: [
        { label: "Advance Payment", amount: safeAdvance },
        { label: "Payment After Completion Of Work", amount: balance },
      ],
      totals: {
        serviceTotal: subtotal,
      },
      currencySymbol: currencySymbols[currency] || "Rs. ",
      accountDetails: {
        accountNo: "0313073000001575",
        name: "QONCEPT ADS AND BRANDING SOLUTIONS PVT LTD",
        ifsc: "SIBL0000313",
        bank: "South Indian Bank, Kakkanad",
        upiId: "qr.qoncept@sib",
      },
      apartTitle: "What Sets Us Apart",
      chooseTitle: "Choose Qoncept",
      chooseText:
        "If you're searching for a dynamic branding partner in Kerala, Qoncept is the right choice.",
      contactTitle: "Contact Us",
      contactText:
        "Ready to enhance your brand's visibility and drive growth? Reach out to Qoncept today to explore possibilities.",
      contact: {
        company: "Qoncept Ads & Branding Solutions Pvt Ltd",
        addressLines: [
          "3rd Floor Matz Commercial building,",
          "Chittethukara, Kakkanad, Ernakulam",
          "682037 Kerala",
        ],
        phones: "9947220777, 7012687630",
        email: "hi@qonceptad.com",
      },
      proposalMeta: {
        contactName: contact.name,
        contactEmail: contact.email,
        contactPhone: contact.phone,
        businessName: contact.businessName || "",  // assuming businessName is a field
        proposalNumber,
      },
    };

    const templatePath = path.join(process.cwd(), "src", "app", "lib", "templates", "qoncept_proposal.ejs");
    const template = await readFile(templatePath, "utf-8");
    const html = ejs.render(template, { data: renderPayload });
const browser = await puppeteer.launch({
  args: chromium.args,
  defaultViewport: { width: 1280, height: 800 },
  executablePath: await chromium.executablePath(),
  headless: true,
});
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    // Save to DB
    await Proposal.create({
      contactId: new Types.ObjectId(contactId),
      createdBy: new Types.ObjectId(user._id),
      version,
      proposalNumber,
      snapshot: renderPayload,
      items: normalizedItems,
      totals: {
        subtotal,
        advance: safeAdvance,
        balance,
        currency,
      },
    });

    const fileContactName = sanitizeFilePart(contact.name || "contact");
    const fileName = `${fileContactName}-proposal-v${version}.pdf`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Error generating proposal:", error);
    return NextResponse.json(
      { message: error.message || "Failed to generate proposal" },
      { status: error.status || 500 }
    );
  }
}