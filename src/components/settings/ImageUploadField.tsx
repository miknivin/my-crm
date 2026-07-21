/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useRef, useState } from "react";
import { toast } from "react-toastify";
import Button from "@/components/ui/button/Button";
import ShortSpinnerDark from "@/components/ui/loaders/ShortSpinnerDark";
import { uploadImageToS3, UploadFolder } from "@/helpers/uploadToS3";

interface ImageUploadFieldProps {
  label: string;
  folder: UploadFolder;
  currentUrl?: string;
  onUploaded: (image: { url: string; key: string }) => void;
  shape?: "circle" | "square";
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export default function ImageUploadField({
  label,
  folder,
  currentUrl,
  onUploaded,
  shape = "square",
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentUrl);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsUploading(true);

    try {
      const uploaded = await uploadImageToS3(file, folder);
      onUploaded(uploaded);
      toast.success(`${label} uploaded`);
    } catch (error: any) {
      toast.error(error?.message || `Failed to upload ${label.toLowerCase()}`);
      setPreviewUrl(currentUrl);
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(objectUrl);
    }
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">{label}</label>
      <div className="flex items-center gap-4">
        <div
          className={`relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 ${
            shape === "circle" ? "rounded-full" : "rounded-lg"
          }`}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={label} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-gray-400">No image</span>
          )}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <ShortSpinnerDark />
            </div>
          )}
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => inputRef.current?.click()}>
            {previewUrl ? "Change image" : "Upload image"}
          </Button>
        </div>
      </div>
    </div>
  );
}
