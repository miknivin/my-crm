export type UploadFolder = "avatars" | "logos";

export interface UploadedImage {
  url: string;
  key: string;
}

/**
 * Uploads an image file directly to S3 via a presigned PUT URL:
 * 1. ask the backend for a presigned URL scoped to this file/folder
 * 2. PUT the file straight to S3 from the browser
 * 3. return the public URL to persist on the owning record
 */
export async function uploadImageToS3(file: File, folder: UploadFolder): Promise<UploadedImage> {
  const presignRes = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ fileName: file.name, fileType: file.type, folder }),
  });

  if (!presignRes.ok) {
    const parsed = await presignRes.json().catch(() => null);
    throw new Error(parsed?.message || "Failed to get an upload URL");
  }

  const { data } = (await presignRes.json()) as { data: { uploadUrl: string; publicUrl: string; key: string } };

  const uploadRes = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("Failed to upload the image");
  }

  return { url: data.publicUrl, key: data.key };
}
