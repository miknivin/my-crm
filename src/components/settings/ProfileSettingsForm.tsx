/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { RootState } from "@/app/redux/rootReducer";
import { useUpdateProfileMutation } from "@/app/redux/api/userApi";
import Button from "@/components/ui/button/Button";
import ShortSpinnerDark from "@/components/ui/loaders/ShortSpinnerDark";
import ImageUploadField from "./ImageUploadField";

export default function ProfileSettingsForm() {
  const { user } = useSelector((state: RootState) => state.user);
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [avatar, setAvatar] = useState(user?.avatar);

  useEffect(() => {
    setName(user?.name || "");
    setPhone(user?.phone || "");
    setAvatar(user?.avatar);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim(), avatar }).unwrap();
      toast.success("Profile updated");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update profile");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <ImageUploadField
        label="Profile photo"
        folder="avatars"
        shape="circle"
        currentUrl={avatar?.url}
        onUploaded={({ url, key }) => setAvatar({ url, public_id: key })}
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Phone</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Email</label>
        <input
          value={user?.email || ""}
          disabled
          className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? <ShortSpinnerDark /> : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
