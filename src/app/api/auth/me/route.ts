import { NextRequest, NextResponse } from "next/server";
import { IUser } from "@/app/models/User";
import { isAuthenticatedUser } from "../../middlewares/auth";
import dbConnect from "@/app/lib/db/connection";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const user: IUser = await isAuthenticatedUser(req);
    return NextResponse.json({ success: true, user }, { status: 200 });
  } catch (error: unknown) {
    const statusCode = 401;
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: statusCode }
    );
  }
}