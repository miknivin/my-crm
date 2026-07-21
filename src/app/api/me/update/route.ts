/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/app/lib/db/connection";
import User from "@/app/models/User";
import { isAuthenticatedUser } from "@/app/api/middlewares/auth";

interface UpdateProfileBody {
  name?: string;
  phone?: string;
  avatar?: { public_id: string; url: string };
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const currentUser = await isAuthenticatedUser(req);

    const body = (await req.json()) as UpdateProfileBody;
    const update: UpdateProfileBody = {};

    if (body.name !== undefined) update.name = body.name.trim();
    if (body.phone !== undefined) update.phone = body.phone.trim();
    if (body.avatar !== undefined) update.avatar = body.avatar;

    const updatedUser = await User.findByIdAndUpdate(
      currentUser._id,
      { $set: update },
      { new: true, runValidators: true }
    );

    return NextResponse.json(
      { success: true, message: "Profile updated successfully", user: updatedUser },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating profile:", error);
    if (error.message?.includes("login") || error.message?.includes("not found")) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    return NextResponse.json({ message: error.message || "Failed to update profile" }, { status: 500 });
  }
}
