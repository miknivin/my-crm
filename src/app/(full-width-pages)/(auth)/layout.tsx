"use client";

import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import { ThemeProvider } from "@/context/ThemeContext";
import FullLoadingScreen from "@/components/ui/loaders/FullLoadingScreen";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { RootState } from "@/app/redux/rootReducer";
import { getLogoSrc } from "@/app/lib/utils/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, loading } = useSelector((state: RootState) => ({
    isAuthenticated: state.user.isAuthenticated,
    loading: state.user.loading,
  }));

  useEffect(() => {
    //console.log("isAuthenticated:", isAuthenticated, "loading:", loading); // Debug log
    if (isAuthenticated && !loading) {
      router.push("/");
    }
  }, [isAuthenticated, router,loading]);

  if (loading) {
    return <FullLoadingScreen />;
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <ThemeProvider>
        <div className="relative flex lg:flex-row w-full h-screen justify-center flex-col dark:bg-gray-900 sm:p-0">
          {children}
          <div className="lg:w-1/2 w-full h-full bg-brand-950 dark:bg-white/5 lg:grid items-center hidden">
            <div className="relative items-center justify-center flex z-1">
              {/* <!-- ===== Common Grid Shape Start ===== --> */}
              <GridShape />
              <div className="flex flex-col items-center max-w-xs">
                <Link href="/" className="block mb-4">
                  <Image
                    width={231}
                    height={48}
                    src={getLogoSrc("/images/logo/auth-logo.png")}
                    alt="Logo"
                  />
                </Link>
                {/* <p className="text-center text-gray-400 dark:text-white/60">
                  Free and Open-Source Tailwind CSS Admin Dashboard Template
                </p> */}
              </div>
            </div>
          </div>
          <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
