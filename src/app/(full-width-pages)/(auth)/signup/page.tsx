import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";
import { getAppMetaTitle } from "@/app/lib/utils/metadata";

export const metadata: Metadata = {
  title: getAppMetaTitle("Qoncept BMS"),
  description: "",
  // other metadata
};

export default function SignUp() {
  return <SignUpForm />;
}
