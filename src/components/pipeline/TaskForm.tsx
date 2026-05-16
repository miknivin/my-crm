/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

import {
  TaskItem,
  TaskPriority,
  TaskStatus,
  useCreateTaskMutation,
  useUpdateTaskMutation,
} from "@/app/redux/api/contactApi";
import { RootState } from "@/app/redux/rootReducer";
import { useGetTeamMembersQuery } from "@/app/redux/api/userApi";
import Chip from "@/components/ui/chips/Chip";

interface Contact {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
}

interface TaskFormProps {
  contact?: Contact | null;
  editingTask: TaskItem | null;
  onClose: () => void;
  onCancelEdit: () => void;
  onSaved: () => void;
}

interface TaskFormState {
  title: string;
  description: string;
  assignedTo: string[];
  dueDate: string;
  dueTime: string;
  priority: TaskPriority;
  status: TaskStatus;
  addToCalendar: boolean;
}

interface SelectedAssignee {
  _id: string;
  name?: string;
}

const emptyForm: TaskFormState = {
  title: "",
  description: "",
  assignedTo: [],
  dueDate: "",
  dueTime: "",
  priority: "medium",
  status: "open",
  addToCalendar: false,
};

const statusOptions: TaskStatus[] = ["open", "in_progress", "done"];
const priorityOptions: TaskPriority[] = ["low", "medium", "high"];

const formatLabel = (value: string) => value.replace(/_/g, " ");

function UserDropdown({
  isLoading,
  teamMembers,
  selectedIds,
  onSelectMember,
}: {
  isLoading: boolean;
  teamMembers: Array<{ _id?: string; name?: string; email?: string }>;
  selectedIds: string[];
  onSelectMember: (memberId: string) => void;
}) {
  return (
    <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
      <ul className="max-h-56 overflow-y-auto py-2 text-sm text-gray-700 custom-scrollbar dark:text-gray-200">
        {isLoading ? (
          <li className="px-4 py-2">Loading...</li>
        ) : teamMembers.length > 0 ? (
          teamMembers
            .filter((member) => member._id && !selectedIds.includes(member._id))
            .map((member) => (
              <li key={member._id}>
                <button
                  type="button"
                  className="block w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-white/5"
                  onClick={() => member._id && onSelectMember(member._id)}
                >
                  <span className="block font-medium">{member.name || "Unnamed"}</span>
                  {member.email && <span className="block text-xs text-gray-500 dark:text-gray-400">{member.email}</span>}
                </button>
              </li>
            ))
        ) : (
          <li className="px-4 py-2">No users found</li>
        )}
      </ul>
    </div>
  );
}

export default function TaskForm({ contact, editingTask, onClose, onCancelEdit, onSaved }: TaskFormProps) {
  const [form, setForm] = useState<TaskFormState>(emptyForm);
  const [contactQuery, setContactQuery] = useState("");
  const [contactOptions, setContactOptions] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isContactDropdownOpen, setIsContactDropdownOpen] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<SelectedAssignee[]>([]);
  const { user } = useSelector((state: RootState) => state.user);
  const { data: teamMembersData, isLoading: isTeamMembersLoading } = useGetTeamMembersQuery({
    page: 1,
    limit: 10,
    search: userQuery,
  });
  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();

  const isAdmin = user?.role === "admin";
  const teamMembers = useMemo(() => teamMembersData?.users ?? [], [teamMembersData]);

  useEffect(() => {
    if (!editingTask) {
      setForm(emptyForm);
      setSelectedContact(null);
      setContactQuery("");
      setSelectedAssignees([]);
      return;
    }

    const assignees = (editingTask.assignedTo || [])
      .map((assignee) =>
        typeof assignee === "string" ? { _id: assignee } : { _id: assignee._id, name: assignee.name }
      )
      .filter((assignee): assignee is SelectedAssignee => Boolean(assignee._id));

    setForm({
      title: editingTask.title || "",
      description: editingTask.description || "",
      assignedTo: assignees.map((assignee) => assignee._id),
      dueDate: editingTask.dueDate ? editingTask.dueDate.slice(0, 10) : "",
      dueTime: editingTask.dueTime || "",
      priority: editingTask.priority,
      status: editingTask.status,
      addToCalendar: false,
    });
    setSelectedAssignees(assignees);
  }, [editingTask]);

  useEffect(() => {
    if (contact?._id || !contactQuery.trim()) {
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
  }, [contact?._id, contactQuery]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    const checked = event.target instanceof HTMLInputElement ? event.target.checked : false;
    const type = event.target instanceof HTMLInputElement ? event.target.type : "";
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const handleAssigneeToggle = (userId: string, name?: string) => {
    setForm((current) => ({
      ...current,
      assignedTo: current.assignedTo.includes(userId)
        ? current.assignedTo.filter((id) => id !== userId)
        : [...current.assignedTo, userId],
    }));
    setSelectedAssignees((current) =>
      current.some((assignee) => assignee._id === userId)
        ? current.filter((assignee) => assignee._id !== userId)
        : [...current, { _id: userId, name }]
    );
  };

  const getSelectedMemberName = (userId: string) => {
    const selected = selectedAssignees.find((item) => item._id === userId);
    if (selected?.name) return selected.name;
    const member = teamMembers.find((item) => item._id === userId);
    return member?.name || "Selected user";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    const linkedContact = contact?._id ? contact : selectedContact;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      type: linkedContact?._id ? ("contact_linked" as const) : ("custom" as const),
      contactId: linkedContact?._id ?? null,
      assignedTo: isAdmin ? form.assignedTo : undefined,
      dueDate: form.dueDate || null,
      dueTime: form.dueTime || null,
      priority: form.priority,
      status: form.status,
      addToCalendar: form.addToCalendar,
    };

    try {
      if (editingTask) {
        await updateTask({ id: editingTask._id, ...payload }).unwrap();
        toast.success("Task updated");
      } else {
        await createTask(payload).unwrap();
        toast.success("Task created");
      }
      setForm(emptyForm);
      setSelectedContact(null);
      setContactQuery("");
      setSelectedAssignees([]);
      onSaved();
    } catch (error: any) {
      toast.error(error?.data?.error || "Failed to save task");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {contact?._id && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white">Contact</label>
          <input
            value={contact.name || contact._id}
            readOnly
            className="h-11 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
      )}
      {!contact?._id && (
        <div className="relative">
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white">
            Linked Contact
          </label>
          <input
            type="search"
            value={contactQuery}
            onChange={(event) => {
              setContactQuery(event.target.value);
              setIsContactDropdownOpen(event.target.value.length > 0);
            }}
            onFocus={() => setIsContactDropdownOpen(contactOptions.length > 0)}
            onBlur={() => window.setTimeout(() => setIsContactDropdownOpen(false), 200)}
            placeholder="Search contact"
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
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
            <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
              <ul className="max-h-56 overflow-y-auto py-2 text-sm text-gray-700 custom-scrollbar dark:text-gray-200">
                {contactOptions.map((option) => (
                  <li key={option._id}>
                    <button
                      type="button"
                      className="block w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-white/5"
                      onClick={() => {
                        setSelectedContact(option);
                        setContactQuery("");
                        setIsContactDropdownOpen(false);
                      }}
                    >
                      <span className="block font-medium">{option.name || "Unnamed"}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {option.email || option.phone || option.businessName}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white">Title</label>
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          required
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white">Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {isAdmin && (
          <div className="relative">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white">Assigned To</label>
            <input
              type="text"
              value={userQuery}
              onChange={(event) => {
                setUserQuery(event.target.value);
                setIsUserDropdownOpen(event.target.value.length > 0);
              }}
              onFocus={() => setIsUserDropdownOpen(userQuery.length > 0)}
              onBlur={() => window.setTimeout(() => setIsUserDropdownOpen(false), 200)}
              placeholder="Search users"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
            {form.assignedTo.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.assignedTo.map((userId) => (
                  <Chip
                    key={userId}
                    text={getSelectedMemberName(userId)}
                    onRemove={() => handleAssigneeToggle(userId)}
                  />
                ))}
              </div>
            )}
            {isUserDropdownOpen && (
              <UserDropdown
                isLoading={isTeamMembersLoading}
                teamMembers={teamMembers}
                selectedIds={form.assignedTo}
                onSelectMember={(memberId) => {
                  const member = teamMembers.find((item) => item._id === memberId);
                  handleAssigneeToggle(memberId, member?.name);
                  setUserQuery("");
                  setIsUserDropdownOpen(false);
                }}
              />
            )}
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white">Due Date</label>
          <input
            type="date"
            name="dueDate"
            value={form.dueDate}
            onChange={handleChange}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white">Due Time</label>
          <input
            type="time"
            name="dueTime"
            value={form.dueTime}
            onChange={handleChange}
            disabled={!form.dueDate}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white">Priority</label>
          <select
            name="priority"
            value={form.priority}
            onChange={handleChange}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            {priorityOptions.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white">Status</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {formatLabel(status)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          name="addToCalendar"
          checked={form.addToCalendar}
          onChange={handleChange}
          disabled={!form.dueDate}
          className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 disabled:opacity-50"
        />
        <span>Add due date to calendar</span>
      </label>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={editingTask ? onCancelEdit : onClose}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {editingTask ? "Cancel Edit" : "Close"}
        </button>
        <button
          type="submit"
          disabled={isCreating || isUpdating}
          className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {isCreating || isUpdating ? "Saving..." : editingTask ? "Update Task" : "Create Task"}
        </button>
      </div>
    </form>
  );
}
