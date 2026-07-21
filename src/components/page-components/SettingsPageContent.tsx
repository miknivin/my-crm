"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/app/redux/rootReducer";
import ProfileSettingsForm from "@/components/settings/ProfileSettingsForm";
import CompanySettingsForm from "@/components/settings/CompanySettingsForm";

type SettingsTab = "profile" | "company";

export default function SettingsPageContent() {
  const { user } = useSelector((state: RootState) => state.user);
  const isAdmin = user?.role === "admin";
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  return (
    <div>
      <div className="mb-6 flex gap-2 border-b border-gray-200 dark:border-gray-800">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`border-b-2 px-1 pb-3 text-sm font-medium ${
            activeTab === "profile"
              ? "border-brand-500 text-brand-500"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          Profile
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab("company")}
            className={`border-b-2 px-1 pb-3 text-sm font-medium ${
              activeTab === "company"
                ? "border-brand-500 text-brand-500"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Company
          </button>
        )}
      </div>

      {activeTab === "profile" && <ProfileSettingsForm />}
      {activeTab === "company" && isAdmin && <CompanySettingsForm />}
    </div>
  );
}
