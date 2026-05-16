"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

import {
  TaskItem,
  TaskPriority,
  TaskStatus,
  useDeleteTaskMutation,
  useGetTasksQuery,
  useUpdateTaskMutation,
} from "@/app/redux/api/contactApi";
import { RootState } from "@/app/redux/rootReducer";
import TaskCard, { getTaskAssigneeLabel, getTaskDueLabel, TaskPriorityBadge } from "@/components/pipeline/TaskCard";
import DeleteIcon from "@/components/ui/flowbiteIcons/Delete";
import EditIcon from "@/components/ui/flowbiteIcons/EditIcon";
import ShortSpinnerPrimary from "@/components/ui/loaders/ShortSpinnerPrimary";
import { Modal } from "@/components/ui/modal";

type ViewMode = "grid" | "table";

const taskStatusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const taskPriorityOptions: TaskPriority[] = ["low", "medium", "high"];
const pageSizeOptions = [6, 12, 24, 48];

const isTaskStatus = (value: string | null): value is TaskStatus => {
  return value === "open" || value === "in_progress" || value === "done";
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "error" in error.data &&
    typeof error.data.error === "string"
  ) {
    return error.data.error;
  }

  return fallback;
};

const getIdentityId = (value: string | { _id?: string } | null | undefined) => {
  if (!value) return "";
  return typeof value === "string" ? value : value._id ?? "";
};

const getTaskContactId = (task: TaskItem) => {
  if (!task.contactId) return null;
  return typeof task.contactId === "string" ? task.contactId : task.contactId._id;
};

const canManageTask = (task: TaskItem, user: RootState["user"]["user"]) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  return getIdentityId(task.owner) === user._id?.toString();
};

interface EditTaskFormState {
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  priority: TaskPriority;
  status: TaskStatus;
}

function TaskEditModal({
  task,
  isUpdating,
  onClose,
  onSave,
}: {
  task: TaskItem | null;
  isUpdating?: boolean;
  onClose: () => void;
  onSave: (task: TaskItem, payload: EditTaskFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<EditTaskFormState>({
    title: "",
    description: "",
    dueDate: "",
    dueTime: "",
    priority: "medium",
    status: "open",
  });

  useEffect(() => {
    if (!task) return;
    setForm({
      title: task.title || "",
      description: task.description || "",
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      dueTime: task.dueTime || "",
      priority: task.priority,
      status: task.status,
    });
  }, [task]);

  if (!task) return null;

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave(task, {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
    });
  };

  return (
    <Modal isOpen={!!task} onClose={onClose} className="max-w-[640px] p-6 lg:p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit task</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Update the task details and save changes.</p>
        </div>

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
              {taskPriorityOptions.map((priority) => (
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
              {taskStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isUpdating}
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {isUpdating ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (value: ViewMode) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-white/[0.03]">
      {(["grid", "table"] as ViewMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
            value === mode
              ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
              : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}

function PaginationControls({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
}: {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Showing {start}-{end} of {total}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={limit}
          onChange={(event) => onLimitChange(Number(event.target.value))}
          className="h-9 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          aria-label="Tasks per page"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="h-9 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Previous
          </button>
          <span className="min-w-20 text-center text-sm text-gray-500 dark:text-gray-400">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="h-9 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function TasksTable({
  tasks,
  isUpdating,
  isDeleting,
  canManage,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  tasks: TaskItem[];
  isUpdating?: boolean;
  isDeleting?: boolean;
  canManage: (task: TaskItem) => boolean;
  onStatusChange: (task: TaskItem, status: TaskStatus) => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (task: TaskItem) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100 text-left text-sm dark:divide-gray-800">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900/50 dark:text-gray-400">
          <tr>
            <th className="px-4 py-3 font-medium">Task</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Priority</th>
            <th className="px-4 py-3 font-medium">Due</th>
            <th className="px-4 py-3 font-medium">Assigned</th>
            <th className="px-4 py-3 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {tasks.map((task) => (
            <tr key={task._id} className="align-top">
              <td className="max-w-[420px] px-4 py-4">
                <div className="font-medium text-gray-900 dark:text-white/90">{task.title}</div>
                {task.description && <div className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{task.description}</div>}
              </td>
              <td className="px-4 py-4">
                <select
                  value={task.status}
                  onChange={(event) => onStatusChange(task, event.target.value as TaskStatus)}
                  disabled={isUpdating}
                  className="h-9 min-w-32 rounded-lg border border-gray-300 bg-transparent px-3 text-xs font-medium text-gray-800 shadow-xs outline-none transition-colors focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  {taskStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-4">
                <TaskPriorityBadge priority={task.priority} />
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-gray-500 dark:text-gray-400">{getTaskDueLabel(task)}</td>
              <td className="px-4 py-4 text-gray-500 dark:text-gray-400">{getTaskAssigneeLabel(task)}</td>
              <td className="px-4 py-4">
                {canManage(task) ? (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(task)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                      title="Edit task"
                      aria-label={`Edit task ${task.title}`}
                    >
                      <EditIcon />
                    </button>
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
                  </div>
                ) : (
                  <span className="block text-right text-xs text-gray-400">Status only</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TasksBoard() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const { user } = useSelector((state: RootState) => state.user);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const limitParam = Number(searchParams.get("limit") || 12);
  const limit = pageSizeOptions.includes(limitParam) ? limitParam : 12;
  const filters = useMemo(
    () => {
      const status = searchParams.get("status");
      return {
        contactId: searchParams.get("contactId") || undefined,
        assignedTo: searchParams.get("assignedTo") || undefined,
        status: isTaskStatus(status) ? status : undefined,
        page,
        limit,
        dueStartDate: searchParams.get("dueStartDate") || undefined,
        dueEndDate: searchParams.get("dueEndDate") || undefined,
        updatedStartDate: searchParams.get("updatedStartDate") || undefined,
        updatedEndDate: searchParams.get("updatedEndDate") || undefined,
      };
    },
    [limit, page, searchParams]
  );

  const { data, isLoading, error } = useGetTasksQuery(filters);
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const [deleteTask, { isLoading: isDeleting }] = useDeleteTaskMutation();

  const handleStatusChange = async (task: TaskItem, status: TaskStatus) => {
    try {
      await updateTask({ id: task._id, status }).unwrap();
      toast.success("Task status updated");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update task status"));
    }
  };

  const handleEditSave = async (task: TaskItem, payload: EditTaskFormState) => {
    if (!payload.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    try {
      await updateTask({
        id: task._id,
        title: payload.title,
        description: payload.description || undefined,
        dueDate: payload.dueDate || null,
        dueTime: payload.dueTime || null,
        priority: payload.priority,
        status: payload.status,
      }).unwrap();
      toast.success("Task updated");
      setEditingTask(null);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update task"));
    }
  };

  const handleDelete = async (task: TaskItem) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    try {
      await deleteTask({ id: task._id, contactId: getTaskContactId(task) }).unwrap();
      toast.success("Task deleted");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to delete task"));
    }
  };

  const updatePaginationParams = (nextPage: number, nextLimit = limit) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", String(nextPage));
    next.set("limit", String(nextLimit));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <ShortSpinnerPrimary />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 p-4 text-sm text-red-600">Failed to load tasks.</div>;
  }

  const tasks = data?.tasks ?? [];
  const pagination = data?.pagination ?? {
    page,
    limit,
    total: tasks.length,
    totalPages: 1,
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">{tasks.length} tasks</p>
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No tasks found.</p>
      ) : viewMode === "table" ? (
        <TasksTable
          tasks={tasks}
          isUpdating={isUpdating}
          isDeleting={isDeleting}
          canManage={(task) => canManageTask(task, user)}
          onStatusChange={handleStatusChange}
          onEdit={setEditingTask}
          onDelete={handleDelete}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              isUpdating={isUpdating}
              isDeleting={isDeleting}
              onEdit={canManageTask(task, user) ? setEditingTask : undefined}
              onDelete={canManageTask(task, user) ? handleDelete : undefined}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      <PaginationControls
        page={pagination.page}
        limit={pagination.limit}
        total={pagination.total}
        totalPages={pagination.totalPages}
        onPageChange={(nextPage) => updatePaginationParams(nextPage)}
        onLimitChange={(nextLimit) => updatePaginationParams(1, nextLimit)}
      />

      <TaskEditModal
        task={editingTask}
        isUpdating={isUpdating}
        onClose={() => setEditingTask(null)}
        onSave={handleEditSave}
      />
    </div>
  );
}
