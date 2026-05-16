/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/contacts/my/route.ts

import MongoFilterBuilder from "@/app/classes/MongoFilterBuilder";
import dbConnect from "@/app/lib/db/connection";
import Contact from "@/app/models/Contact";
import { NextResponse } from "next/server";

const FIXED_USER_ID = "6858240f87f5899a7e6fc725";

export async function GET() {
  try {
    await dbConnect();

    const filter = MongoFilterBuilder.create()
      .assignedTo(FIXED_USER_ID)
      // .isConverted()
      // .gte("probability", 40)
      .build();

    console.log(filter, "final filter");

    const contacts = await Contact.find(filter)
      .sort({ updatedAt: -1 })
      .select(
        "name email phone businessName probability value source " +
        "assignedTo pipelinesActive createdAt updatedAt"
      )
      .lean();

    return NextResponse.json({
      success: true,
      count: contacts.length,
      data: contacts,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch contacts",
        ...(process.env.NODE_ENV === "development" && { details: error.message }),
      },
      { status: 500 }
    );
  }
}