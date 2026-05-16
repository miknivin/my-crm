import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export interface ExtendedNextRequest extends NextRequest {
  validatedBody?: {
    name: string;
    email: string;
    phone: string;
    userId: string;
    notes?: string;
    businessName?:string;
    tags?:[];
    stage?:string;
  };
}

export async function validateContactRequest(req: ExtendedNextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, userId } = body;

    // Validate required fields
    if (!name || !email || !phone || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, phone, and userId are required" },
        { status: 400 }
      );
    }

    // Validate userId as ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid userId format" },
        { status: 400 }
      );
    }

    // Attach validated body to request for use in handler
     req.validatedBody = body;
    return null; // Indicates validation passed
  } catch (error) {
    console.log(error);
    
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}