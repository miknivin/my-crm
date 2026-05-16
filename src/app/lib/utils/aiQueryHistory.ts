import crypto from "crypto";

export const normalizeQueryText = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const hashQueryText = (text: string) =>
  crypto.createHash("sha256").update(normalizeQueryText(text)).digest("hex");
