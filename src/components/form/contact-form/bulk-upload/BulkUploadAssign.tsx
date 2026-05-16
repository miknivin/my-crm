/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import Button from "@/components/ui/button/Button";
import { useState } from "react";
import { IUser } from "@/app/models/User";
import Chip from "@/components/ui/chips/Chip";
import ShortSpinnerDark from "@/components/ui/loaders/ShortSpinnerDark";
import VeryShortSpinnerPrimary from "@/components/ui/loaders/veryShortSpinnerPrimary";
import { DuplicateCheckResult } from "./ContactImportStepper";

interface BulkUploadAssignProps {
  onClose: () => void;
  selectedContacts: string[];
  teamMembers: IUser[];
  isLoading: boolean;
  isSubmitLoading:boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryError: any;
  selectedUsers: IUser[];
  assignType: "" | "every" | "equally" | "roundRobin";
  addToPipeline: boolean;
  onAssignTypeChange: (value: "" | "every" | "equally" | "roundRobin") => void;
  onSelectUser: (member: IUser) => void;
  onRemoveUser: (userId: string | undefined) => void;
  onPipelineToggle: (checked: boolean) => void;
  onSubmit: () => void;
  onBack: () => void;
  error: string | null;
  duplicateCheckResult: DuplicateCheckResult | null;
}

export default function BulkUploadAssign({
  onClose,
  selectedContacts,
  teamMembers,
  isLoading,
  isSubmitLoading,
  queryError,
  selectedUsers,
  assignType,
  addToPipeline,
  onAssignTypeChange,
  onSelectUser,
  onRemoveUser,
  onPipelineToggle,
  onSubmit,
  onBack,
  error,
  duplicateCheckResult
}: BulkUploadAssignProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsDropdownOpen(value.length > 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onAssignTypeChange(e.target.value as "" | "every" | "equally" | "roundRobin");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <>
      <h2 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
        Assign Contacts
      </h2>
      {duplicateCheckResult && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Total Contacts: {duplicateCheckResult.totalContacts} | New Contacts: {duplicateCheckResult.newCount} | Duplicate Contacts: {duplicateCheckResult.duplicateCount}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="assignType"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Select type of assign
          </label>
          <select
            id="assignType"
            name="assignType"
            value={assignType}
            onChange={handleInputChange}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          >
            <option value="">Choose a Type</option>
            <option value="every">Assign to everyone</option>
            <option value="equally">Assign Equally</option>
            <option value="roundRobin">Assign By Round Robin</option>
          </select>
        </div>
        <div className="mb-4 relative">
          <label
            htmlFor="simple-search"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Search users
          </label>
          <input
            type="text"
            id="simple-search"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setIsDropdownOpen(searchQuery.length > 0)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Search users"
          />
          {selectedUsers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedUsers.map((user) =>
                user.name && user._id ? (
                  <Chip
                    key={user._id}
                    text={user.name}
                    onRemove={() => onRemoveUser(user._id)}
                  />
                ) : null
              )}
            </div>
          )}
          {isDropdownOpen && (
            <div
              id="dropdownDivider"
              className="z-10 absolute mt-1 bg-white divide-y divide-gray-100 rounded-lg shadow-sm w-full dark:bg-gray-700 dark:divide-gray-600"
            >
              <ul
                className="py-2 text-sm text-gray-700 dark:text-gray-200"
                aria-labelledby="dropdownDividerButton"
              >
                {queryError ? (
                  <li className="block px-4 py-2 text-red-500">Error loading users</li>
                ) : isLoading ? (
                  <li className="block px-4 py-2">Loading...</li>
                ) : Array.isArray(teamMembers) && teamMembers.length > 0 ? (
                  teamMembers
                    .filter((member: IUser) =>
                      member._id !== undefined &&
                      !selectedUsers.some((user) => user._id === member._id)
                    )
                    .map((member: IUser) => (
                      <li key={member._id || Date.now()}>
                        <button
                          type="button"
                          className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                          onClick={() => onSelectUser(member)}
                        >
                          {member.name || "Unnamed User"}
                        </button>
                      </li>
                    ))
                ) : (
                  <li className="block px-4 py-2">No users found</li>
                )}
              </ul>
            </div>
          )}
        </div>
        <div className="mb-4">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={addToPipeline}
              className="sr-only peer"
              onChange={(e) => onPipelineToggle(e.target.checked)}
            />
            <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600" />
            <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
              Add to pipline
            </span>
          </label>

        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex justify-end space-x-2">
          <Button type="button" onClick={onBack} variant="outline">
          Back
        </Button>
          <Button type="button" onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {isSubmitLoading?<ShortSpinnerDark/>:"Submit"}
          </Button>
        </div>
      </form>
    </>
  );
}