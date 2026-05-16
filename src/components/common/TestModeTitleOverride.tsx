"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === "true";

export default function TestModeTitleOverride() {
  const pathname = usePathname();

  useEffect(() => {
    if (isTestMode) {
      document.title = "custom CRM";
    }
  }, [pathname]);

  return null;
}
