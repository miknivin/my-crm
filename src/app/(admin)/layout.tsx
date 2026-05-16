"use client";
import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { RootState } from "../redux/rootReducer";
import FullLoadingScreen from "@/components/ui/loaders/FullLoadingScreen";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const loading = useSelector((state: RootState) => state.user.loading);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated === false && !loading) {
      router.push("/signin");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return <FullLoadingScreen />;
  }

  if (!isAuthenticated) {
    return null;
  }

  // ────────────────────────────────────────────────
  // Margin logic (when sidebar pushes content)
  // ────────────────────────────────────────────────
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[230px]"
    : "lg:ml-[70px]";

  // ────────────────────────────────────────────────
  // Max-width logic – force full width on mobile & tablet
  // ────────────────────────────────────────────────
  const contentMaxWidth = isExpanded || isHovered
  ? "max-w-full lg:max-w-[calc(100vw-245px)]"
  : "max-w-full lg:max-w-[calc(100vw-85px)]";

  return (
    <div className="min-h-screen xl:flex">
      {/* Sidebar + Backdrop */}
      <AppSidebar />
      <Backdrop />

      {/* Main content area */}
      <div

        className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
      >
        <AppHeader />

        {/* Page content wrapper */}
        <div
          className={`
            mx-auto p-4 md:p-6
            ${contentMaxWidth}
            transition-all duration-300 ease-in-out
          `}
        >
          {children}
        </div>
      </div>
    </div>
  );
}