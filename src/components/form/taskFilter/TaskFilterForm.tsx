"use client";

import { IUser } from "@/app/models/User";
import { useGetTeamMembersQuery } from "@/app/redux/api/userApi";
import Chip from "@/components/ui/chips/Chip";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

interface TaskFilterFormProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SelectedUser {
  _id: string;
  isNot: boolean;
  name?: string;
}

interface ContactOption {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
}

export default function TaskFilterForm({ isOpen, onClose }: TaskFilterFormProps) {
  const offCanvasRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [contactQuery, setContactQuery] = useState("");
  const [contactOptions, setContactOptions] = useState<ContactOption[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactOption | null>(null);
  const [isContactDropdownOpen, setIsContactDropdownOpen] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [isNotFilter, setIsNotFilter] = useState(false);
  const [dueStartDate, setDueStartDate] = useState("");
  const [dueEndDate, setDueEndDate] = useState("");
  const [updatedStartDate, setUpdatedStartDate] = useState("");
  const [updatedEndDate, setUpdatedEndDate] = useState("");

  const { data: teamMembersData, isLoading } = useGetTeamMembersQuery({
    page: 1,
    limit: 10,
    search: userQuery,
  });

  const teamMembers = useMemo(() => teamMembersData?.users || [], [teamMembersData]);

  useEffect(() => {
    setDueStartDate(searchParams.get("dueStartDate") || "");
    setDueEndDate(searchParams.get("dueEndDate") || "");
    setUpdatedStartDate(searchParams.get("updatedStartDate") || "");
    setUpdatedEndDate(searchParams.get("updatedEndDate") || "");

    const contactId = searchParams.get("contactId");
    const contactLabel = searchParams.get("contactLabel");
    setSelectedContact(contactId ? { _id: contactId, name: contactLabel || "Selected contact" } : null);

    const assignedTo = searchParams.get("assignedTo");
    if (assignedTo) {
      try {
        const parsedUsers = JSON.parse(assignedTo);
        setSelectedUsers(Array.isArray(parsedUsers) ? parsedUsers : []);
      } catch {
        setSelectedUsers([]);
      }
    } else {
      setSelectedUsers([]);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (offCanvasRef.current && !offCanvasRef.current.contains(event.target as Node) && isOpen) {
        onClose();
        setIsContactDropdownOpen(false);
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!contactQuery.trim()) {
      setContactOptions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/contacts/search?keyword=${encodeURIComponent(contactQuery)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        setContactOptions(data.contacts || []);
        setIsContactDropdownOpen(true);
      } catch {
        if (!controller.signal.aborted) setContactOptions([]);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [contactQuery]);

  const getSelectedUserName = (item: SelectedUser) => {
    const member = teamMembers.find((user) => user._id === item._id);
    return item.name || member?.name || "Selected user";
  };

  const handleSelectMember = (member: IUser) => {
    if (!member._id || selectedUsers.some((item) => item._id === member._id)) return;
    setSelectedUsers((current) => [{ _id: member._id!, isNot: isNotFilter, name: member.name }, ...current]);
    setUserQuery("");
    setIsUserDropdownOpen(false);
  };

  const handleApplyFilters = () => {
    const params = new URLSearchParams(searchParams);

    if (selectedContact) {
      params.set("contactId", selectedContact._id);
      params.set("contactLabel", selectedContact.name || selectedContact.email || selectedContact._id);
    } else {
      params.delete("contactId");
      params.delete("contactLabel");
    }

    if (selectedUsers.length > 0) params.set("assignedTo", JSON.stringify(selectedUsers));
    else params.delete("assignedTo");

    if (dueStartDate) params.set("dueStartDate", dueStartDate);
    else params.delete("dueStartDate");
    if (dueEndDate) params.set("dueEndDate", dueEndDate);
    else params.delete("dueEndDate");
    if (updatedStartDate) params.set("updatedStartDate", updatedStartDate);
    else params.delete("updatedStartDate");
    if (updatedEndDate) params.set("updatedEndDate", updatedEndDate);
    else params.delete("updatedEndDate");

    router.push(`?${params.toString()}`);
    onClose();
  };

  const handleClearFilters = () => {
    setSelectedContact(null);
    setContactQuery("");
    setSelectedUsers([]);
    setDueStartDate("");
    setDueEndDate("");
    setUpdatedStartDate("");
    setUpdatedEndDate("");

    const params = new URLSearchParams(searchParams);
    ["contactId", "contactLabel", "assignedTo", "dueStartDate", "dueEndDate", "updatedStartDate", "updatedEndDate"].forEach((key) =>
      params.delete(key)
    );
    router.push(`?${params.toString()}`);
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-30 bg-black/70 transition-opacity" aria-hidden="true" />}
      <div
        ref={offCanvasRef}
        className={`fixed top-0 right-0 z-999 h-dvh w-80 overflow-y-auto bg-white p-4 transition-transform dark:bg-gray-800 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        tabIndex={-1}
      >
        <h5 className="mb-4 mt-7 inline-flex items-center text-base font-semibold text-gray-500 dark:text-gray-400">
          Filter Tasks
        </h5>
        <button
          type="button"
          onClick={onClose}
          className="absolute end-2.5 top-2.5 mt-7 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
        >
          <span className="sr-only">Close menu</span>
          x
        </button>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleApplyFilters();
          }}
          className="space-y-4"
        >
          <div className="relative">
            <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">Contact</label>
            <input
              type="search"
              value={contactQuery}
              onChange={(event) => setContactQuery(event.target.value)}
              onFocus={() => setIsContactDropdownOpen(contactOptions.length > 0)}
              placeholder="Search contact"
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            {selectedContact && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Chip
                  text={selectedContact.name || selectedContact.email || "Selected contact"}
                  onRemove={() => setSelectedContact(null)}
                />
              </div>
            )}
            {isContactDropdownOpen && contactOptions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg bg-white shadow-sm dark:bg-gray-700">
                {contactOptions.map((contact) => (
                  <button
                    key={contact._id}
                    type="button"
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                    onClick={() => {
                      setSelectedContact(contact);
                      setContactQuery("");
                      setIsContactDropdownOpen(false);
                    }}
                  >
                    <span className="block font-medium">{contact.name || "Unnamed"}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-300">{contact.email || contact.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-900 dark:text-white">Users</label>
              <label className="inline-flex cursor-pointer items-center text-xs text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={isNotFilter} onChange={(event) => setIsNotFilter(event.target.checked)} className="mr-2" />
                Exclude
              </label>
            </div>
            <input
              type="text"
              value={userQuery}
              onChange={(event) => {
                setUserQuery(event.target.value);
                setIsUserDropdownOpen(event.target.value.length > 0);
              }}
              onFocus={() => setIsUserDropdownOpen(userQuery.length > 0)}
              placeholder="Search users"
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            {selectedUsers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedUsers.map((item) => (
                  <Chip
                    key={item._id}
                    text={getSelectedUserName(item)}
                    isNot={item.isNot}
                    onRemove={() => setSelectedUsers((current) => current.filter((user) => user._id !== item._id))}
                  />
                ))}
              </div>
            )}
            {isUserDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full rounded-lg bg-white shadow-sm dark:bg-gray-700">
                {isLoading ? (
                  <div className="px-4 py-2 text-sm">Loading...</div>
                ) : (
                  teamMembers
                    .filter((member) => !selectedUsers.some((item) => item._id === member._id))
                    .map((member) => (
                      <button
                        key={member._id}
                        type="button"
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                        onClick={() => handleSelectMember(member)}
                      >
                        {member.name}
                      </button>
                    ))
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              Due From
              <input type="date" value={dueStartDate} onChange={(event) => setDueStartDate(event.target.value)} className="mt-2 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            </label>
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              Due To
              <input type="date" value={dueEndDate} onChange={(event) => setDueEndDate(event.target.value)} className="mt-2 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            </label>
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              Updated From
              <input type="date" value={updatedStartDate} onChange={(event) => setUpdatedStartDate(event.target.value)} className="mt-2 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            </label>
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              Updated To
              <input type="date" value={updatedEndDate} onChange={(event) => setUpdatedEndDate(event.target.value)} className="mt-2 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
              Apply
            </button>
            <button type="button" onClick={handleClearFilters} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Clear
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
