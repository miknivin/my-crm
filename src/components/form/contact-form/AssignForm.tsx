/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import Button from "@/components/ui/button/Button";
import { useState } from "react";
import { toast } from "react-toastify";
import { useGetTeamMembersQuery } from "@/app/redux/api/userApi";
import { useAssignContactsMutation } from "@/app/redux/api/contactApi";
import { IUser } from "@/app/models/User";
import Chip from "@/components/ui/chips/Chip";
import ShortSpinnerDark from "@/components/ui/loaders/ShortSpinnerDark";

interface AssignContactsFormProps {
  onClose: () => void;
  selectedContacts: string[];
}

interface TeamMembersResponse {
  users: IUser[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AssignContactsForm({ onClose, selectedContacts }: AssignContactsFormProps) {
  const [formData, setFormData] = useState({
    assignType: "" as "" | "every" | "equally" | "roundRobin",
    isAddAsNewLead: false, // Add isAddAsNewLead to form state
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<IUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch users for autocomplete
  const { data: teamMembers, isLoading, error: queryError } = useGetTeamMembersQuery({
    page: 1,
    limit: 10,
    search: searchQuery,
  });

  // Mutation for assigning contacts
  const [assignContacts, { isLoading: assignLoading }] = useAssignContactsMutation();

  // Use teamMembers.users if available, else empty array
  const users = teamMembers?.users && Array.isArray(teamMembers.users) ? teamMembers.users : [];

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value as "" | "every" | "equally" | "roundRobin",
    }));
  };

  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsDropdownOpen(value.length > 0);
  };

  const handleSelectMember = (member: IUser) => {
    if (member._id && !selectedUsers.some((user) => user._id === member._id)) {
      setSelectedUsers((prev) => [...prev, member]);
      setSearchQuery("");
      setIsDropdownOpen(false);
    }
  };

  const handleRemoveUser = (userId: string | undefined) => {
    if (userId) {
      setSelectedUsers((prev) => prev.filter((user) => user._id !== userId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.assignType) {
      setError("Please select an assign type");
      return;
    }
    if (selectedUsers.length === 0) {
      setError("Please select at least one user");
      return;
    }

    try {
      await assignContacts({
        contactIds: selectedContacts,
        userIds: selectedUsers
          .filter((user) => user._id !== undefined)
          .map((user) => user._id!),
        assignType: formData.assignType,
        isAddAsNewLead: formData.isAddAsNewLead, // Include isAddAsNewLead in payload
      }).unwrap();
      toast.success("Contacts assigned successfully");
      onClose();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.data?.error || "Failed to assign contacts");
    }
  };

  return (
    <>
      <h2 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
        Assign Contacts
      </h2>
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
            value={formData.assignType}
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
                    onRemove={() => handleRemoveUser(user._id)}
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
                ) : Array.isArray(users) && users.length > 0 ? (
                  users
                    .filter((member: IUser) =>
                      member._id !== undefined &&
                      !selectedUsers.some((user) => user._id === member._id)
                    )
                    .map((member: IUser) => (
                      <li key={member._id || Date.now()}>
                        <button
                          type="button"
                          className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                          onClick={() => handleSelectMember(member)}
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
        <div>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="isAddAsNewLead"
              checked={formData.isAddAsNewLead}
              onChange={handleToggleChange}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600" />
            <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
              Add to pipeline as new lead
            </span>
          </label>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex justify-end space-x-2">
          <Button type="button" onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={assignLoading} variant="primary">
            {assignLoading ? <ShortSpinnerDark /> : "Assign"}
          </Button>
        </div>
      </form>
    </>
  );
}