/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";
import { NextRequest, NextResponse } from "next/server";
import User from "@/app/models/User";
import dbConnect from "@/app/lib/db/connection";
import { sendPasswordResetEmail } from "../../utils/sendResetPasswordEmail";
export async function POST(req:NextRequest) {
  try {
    await dbConnect();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: "User not found with this email" },
        { status: 401 }
      );
    }

    const resetToken = user.getResetPasswordToken();
    await user.save();
    await sendPasswordResetEmail(email, resetToken);
    return NextResponse.json({
      success: true,
      resetToken,
    });
  } catch (error:any) {
    console.error("Error in forgot password:", error);
    return NextResponse.json(
      { error: error.message, details: error.stack },
      { status: 500 }
    );
  }
}