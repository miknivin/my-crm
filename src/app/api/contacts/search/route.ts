/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { authorizeRoles, isAuthenticatedUser } from "@/app/api/middlewares/auth";
import dbConnect from "@/app/lib/db/connection";
import Contact from "@/app/models/Contact";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const user = await isAuthenticatedUser(req);
    authorizeRoles(user, "admin", "team_member");

    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword") || "";
    const query: Record<string, any> = {};

    if (user.role === "team_member") {
      query["assignedTo.user"] = new Types.ObjectId(user._id);
    }

    if (keyword) {
      const regex = { $regex: keyword, $options: "i" };
      query.$or = [{ name: regex }, { email: regex }, { phone: regex }, { businessName: regex }];
    }

    const contacts = await Contact.find(query)
      .select("_id name email phone businessName")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({ contacts }, { status: 200 });
  } catch (error: any) {
    console.error("Error searching contacts:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
