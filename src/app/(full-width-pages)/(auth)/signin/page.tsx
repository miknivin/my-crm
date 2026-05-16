import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";
import { getAppMetaTitle } from "@/app/lib/utils/metadata";

export const metadata: Metadata = {
  title: getAppMetaTitle("Qoncept"),
  description: "",
};

export default function SignIn() {
  return <SignInForm />;
}
