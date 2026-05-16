import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import ResetPasswordConfirmForm from "@/components/auth/ResetPasswordConfirmForm";
import { Metadata } from "next";
import { getAppMetaTitle } from "@/app/lib/utils/metadata";

// Define metadata for the page
export const metadata: Metadata = {
  title: getAppMetaTitle("Qoncept - Reset password"),
  description: "",
};

// Define the props type, accounting for searchParams being a Promise
interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams; // Await the Promise
  const token = resolvedSearchParams.token as string | undefined; // Type assertion to access token

  return token ? <ResetPasswordConfirmForm /> : <ResetPasswordForm />;
}
