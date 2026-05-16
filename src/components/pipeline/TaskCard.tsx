"use client";

import React, { memo, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { TaskItem, TaskStatus } from "@/app/redux/api/contactApi";
import DeleteIcon from "@/components/ui/flowbiteIcons/Delete";
import EditIcon from "@/components/ui/flowbiteIcons/EditIcon";
import AppTooltip from "@/components/ui/tooltip/AppTooltip";

interface TaskCardProps {
  task: TaskItem;
  isUpdating?: boolean;
  isDeleting?: boolean;
  onEdit?: (task: TaskItem) => void;
  onDelete?: (task: TaskItem) => void;
  onStatusChange: (task: TaskItem, status: TaskStatus) => void;
}

const statusOptions: TaskStatus[] = ["open", "in_progress", "done"];

const statusConfig: Record<TaskStatus, { label: string; dot: string; badge: string }> = {
  open: { label: "Open", dot: "bg-gray-400", badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  in_progress: {
    label: "In progress",
    dot: "bg-brand-500",
    badge: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
  },
  done: {
    label: "Done",
    dot: "bg-success-500",
    badge: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
  },
};

const priorityConfig: Record<TaskItem["priority"], { label: string; icon: string; cls: string }> = {
  high: { label: "High", icon: "!", cls: "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400" },
  medium: {
    label: "Medium",
    icon: "^",
    cls: "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
  },
  low: { label: "Low", icon: "-", cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" },
};

const avatarColors = [
  "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
  "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
  "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
  "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400",
];


const CalendarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const UserIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ChevronIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const getAssignees = (task: TaskItem) => {
  return (task.assignedTo ?? []).filter((assignee): assignee is { _id: string; name: string; email?: string } => {
    return typeof assignee !== "string";
  });
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const getDueDateLabel = (task: TaskItem) => {
  if (!task.dueDate) return null;
  return new Date(task.dueDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getLinkedContact = (task: TaskItem) => {
  if (task.type !== "contact_linked" || !task.contactId || typeof task.contactId === "string") return null;
  return {
    id: task.contactId._id,
    name: task.contactId.name || "Contact",
  };
};

export const getTaskAssigneeLabel = (task: TaskItem) => {
  const assignees = getAssignees(task);
  if (assignees.length === 0) return "Unassigned";
  return assignees.map((assignee) => assignee.name).join(", ");
};

export const getTaskDueLabel = (task: TaskItem) => {
  const dueDate = getDueDateLabel(task);
  if (!dueDate) return "No due date";
  return task.dueTime ? `${dueDate} ${task.dueTime}` : dueDate;
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${config.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export function TaskPriorityBadge({ priority }: { priority: TaskItem["priority"] }) {
  const config = priorityConfig[priority];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${config.cls}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

function TaskTypeBadge({ type }: { type: TaskItem["type"] }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
      <UserIcon />
      {type === "contact_linked" ? "Contact" : "Custom"}
    </span>
  );
}

function StatusDropdown({
  status,
  disabled,
  onChange,
}: {
  status: TaskStatus;
  disabled?: boolean;
  onChange: (status: TaskStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const config = statusConfig[status];

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase disabled:cursor-not-allowed disabled:opacity-60 ${config.badge}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
        {config.label}
        <ChevronIcon />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1.5 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {statusOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 ${
                status === option ? "font-semibold" : "font-normal"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusConfig[option].dot}`} />
              {statusConfig[option].label}
              {status === option && <span className="ml-auto">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AssigneeStack({ task }: { task: TaskItem }) {
  const assignees = getAssignees(task);
  if (assignees.length === 0) return null;

  return (
    <div className="flex items-center">
      {assignees.slice(0, 4).map((assignee, index) => (
        <AppTooltip key={assignee._id} content={assignee.email ? `${assignee.name} (${assignee.email})` : assignee.name}>
          <div
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold dark:border-gray-900 ${
              avatarColors[index % avatarColors.length]
            } ${index > 0 ? "-ml-1.5" : ""}`}
          >
            {getInitials(assignee.name)}
          </div>
        </AppTooltip>
      ))}
      {assignees.length > 4 && (
        <AppTooltip content={assignees.slice(4).map((assignee) => assignee.name).join(", ")}>
          <div className="-ml-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-[10px] font-semibold text-gray-500 dark:border-gray-900 dark:bg-gray-800">
            +{assignees.length - 4}
          </div>
        </AppTooltip>
      )}
    </div>
  );
}

function TaskActions({ task, isDeleting, onEdit, onDelete }: Pick<TaskCardProps, "task" | "isDeleting" | "onEdit" | "onDelete">) {
  if (!onEdit && !onDelete) return null;

  return (
    <div className="flex items-center gap-2">
      {onEdit && (
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          title="Edit task"
          aria-label={`Edit task ${task.title}`}
        >
          <EditIcon />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(task)}
          disabled={isDeleting}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-error-200 bg-error-50 text-error-600 hover:bg-error-100 disabled:opacity-50 dark:border-error-500/20 dark:bg-error-500/10"
          title="Delete task"
          aria-label={`Delete task ${task.title}`}
        >
          <DeleteIcon />
        </button>
      )}
    </div>
  );
}

function TaskCardComponent({ task, isUpdating, isDeleting, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const isDone = task.status === "done";
  const dueDate = getDueDateLabel(task);
  const linkedContact = getLinkedContact(task);

  return (
    <article
      className={`rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.03] ${
        isDone ? "opacity-75" : ""
      }`}
    >
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <TaskPriorityBadge priority={task.priority} />
            <TaskTypeBadge type={task.type} />
          </div>
          <h3 className={`text-sm font-medium leading-snug ${isDone ? "text-gray-400 line-through" : "text-gray-900 dark:text-white/90"}`}>
            {task.title}
          </h3>
        </div>
        <StatusDropdown status={task.status} disabled={isUpdating} onChange={(status) => onStatusChange(task, status)} />
      </div>

      {task.description && <p className="line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{task.description}</p>}

      <div className="my-3 h-px bg-gray-100 dark:bg-gray-800" />

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {dueDate && (
            <span className="inline-flex items-center gap-1">
              <CalendarIcon />
              {dueDate}
            </span>
          )}
          {task.dueTime && (
            <span className="inline-flex items-center gap-1">
              <ClockIcon />
              {task.dueTime}
            </span>
          )}
          {isDone && !dueDate && (
            <span className="inline-flex items-center gap-1">
              <CheckIcon />
              Completed
            </span>
          )}
        </div>
        <AssigneeStack task={task} />
      </div>

      {linkedContact && (
        <>
          <div className="my-3 h-px bg-gray-100 dark:bg-gray-800" />
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <UserIcon />
            <span>Linked to</span>
            <Link href={`/contacts/${linkedContact.id}`} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              {linkedContact.name}
            </Link>
          </div>
        </>
      )}

      {(onEdit || onDelete) && (
        <div className="mt-4 flex justify-end">
          <TaskActions task={task} isDeleting={isDeleting} onEdit={onEdit} onDelete={onDelete} />
        </div>
      )}
    </article>
  );
}

export default memo(TaskCardComponent);
