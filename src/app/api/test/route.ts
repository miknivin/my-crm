/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from "@/app/lib/db/connection";
import { NextResponse } from "next/server";
import Contact from "@/app/models/Contact";

export async function GET() {
  try {
    await dbConnect();
    const query = {
      createdAt: {
        $gte: new Date(new Date().setHours(0,0,0,0) - new Date().getDay() * 86400000),
        $lt: new Date()
      }
    }
    const contacts = await Contact.find(query);

    const total = contacts.length;
    return NextResponse.json({ total, contacts }, { status: 200 });
  } catch (error) {
    console.error("Error fetching contact count:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}