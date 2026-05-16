"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

interface ContactByIdWrapperProps {
  contactId: string;
}

export default function ContactByIdHeader({ contactId }: ContactByIdWrapperProps) {
  const searchParams = useSearchParams();
  const fromPipeline = searchParams.get("fromPipeline");
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile view based on window width
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // Tailwind's md breakpoint
    };

    // Initial check
    handleResize();

    // Add resize event listener
    window.addEventListener("resize", handleResize);

    // Cleanup on unmount
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Determine redirect path
  const defaultPipeline = process.env.NEXT_PUBLIC_DEFAULT_PIPELINE || "default-pipeline-id";
  const redirectPathname = fromPipeline === "true"
    ? isMobile
      ? `/pipelines/mobile/${defaultPipeline}`
      : `/pipelines/${defaultPipeline}`
    : "/contacts";

  const currentQuery = Object.fromEntries(searchParams);
  const newQuery = { ...currentQuery };

  return (
    <div className="flex justify-between w-full px-6 flex-row-reverse">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 text-start">
        #{contactId.slice(-6)}
      </h3>
      <Link
         href={{
          pathname: redirectPathname,
          query: newQuery,
        }}
        className="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700"
        aria-label={fromPipeline === "true" ? "Go back to pipeline" : "Go back to contacts"}
      >
        Go Back
      </Link>
    </div>
  );
}