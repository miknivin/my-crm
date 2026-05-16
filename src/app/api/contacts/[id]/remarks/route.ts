/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";

import { authorizeRoles, isAuthenticatedUser } from "@/app/api/middlewares/auth";
import { logContactActivity } from "@/app/api/utils/activityLog";
import dbConnect from "@/app/lib/db/connection";
import Contact from "@/app/models/Contact";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await isAuthenticatedUser(req);
    authorizeRoles(user, "admin", "team_member");
    const userId = user._id?.toString();
    if (!userId) {
      return NextResponse.json({ error: "Invalid user data" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 });
    }

    const body = await req.json();
    if (!body.text || typeof body.text !== "string" || !body.text.trim()) {
      return NextResponse.json({ error: "Remark text is required" }, { status: 400 });
    }

    const remark = {
      text: body.text.trim(),
      createdBy: new Types.ObjectId(userId),
      createdAt: new Date(),
    };
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const contact = await Contact.findById(id).session(session);
        if (!contact) {
          throw new Error("Contact not found");
        }

        contact.remarks.push(remark);
        await contact.save({ session });

        await logContactActivity({
          contactId: contact._id,
          event: "REMARK_ADDED",
          description: "Remark added",
          performedBy: userId,
          metadata: { text: remark.text },
          session,
        });
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({ message: "Remark added successfully", remark }, { status: 201 });
  } catch (error: any) {
    console.error("Error adding remark:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Contact not found" ? 404 : 500 }
    );
  }
}
