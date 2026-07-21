/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { isAuthenticatedUser } from "@/app/api/middlewares/auth";
import { s3Client, AWS_BUCKET_NAME, buildPublicUrl } from "@/app/lib/aws/s3Client";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);
const ALLOWED_FOLDERS = new Set(["avatars", "logos"]);
const PRESIGN_EXPIRY_SECONDS = 60;

interface PresignBody {
  fileName?: string;
  fileType?: string;
  folder?: string;
}

const sanitizeFileName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "") || "file";

export async function POST(req: NextRequest) {
  try {
    const user = await isAuthenticatedUser(req);

    const body = (await req.json()) as PresignBody;
    const { fileName, fileType, folder } = body;

    if (!fileName || !fileType || !folder) {
      return NextResponse.json({ message: "fileName, fileType and folder are required" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(fileType)) {
      return NextResponse.json({ message: "Only JPEG, PNG, WEBP or SVG images are allowed" }, { status: 400 });
    }

    if (!ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json({ message: "Invalid upload folder" }, { status: 400 });
    }

    const key = `${folder}/${user._id}-${Date.now()}-${sanitizeFileName(fileName)}`;

    const command = new PutObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: PRESIGN_EXPIRY_SECONDS });

    return NextResponse.json(
      { message: "Presigned URL generated", data: { uploadUrl, publicUrl: buildPublicUrl(key), key } },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error generating presigned URL:", error);
    if (error.message?.includes("login") || error.message?.includes("not found")) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    return NextResponse.json({ message: error.message || "Failed to generate presigned URL" }, { status: 500 });
  }
}

export const runtime = "nodejs";
