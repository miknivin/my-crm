/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

import {
  TaskItem,
  TaskStatus,
  useDeleteTaskMutation,
  useGetTasksQuery,
  useUpdateTaskMutation,
} from "@/app/redux/api/contactApi";
import VeryShortSpinnerPrimary from "../ui/loaders/veryShortSpinnerPrimary";
import TaskCard from "./TaskCard";
import TaskForm from "./TaskForm";
import { RootState } from "@/app/redux/rootReducer";

export { default as TaskCard } from "./TaskCard";
export { default as TaskForm } from "./TaskForm";

interface Contact {
  _id: string;
  name?: string;
}

interface TaskTabsProps {
  contact: Contact;
  onClose: () => void;
}

export default function TaskTabs({ contact, onClose }: TaskTabsProps) {
  const [activeTab, setActiveTab] = useState("add-task");
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const { user } = useSelector((state: RootState) => state.user);

  const { data, isLoading, error } = useGetTasksQuery({ contactId: contact._id });
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const [deleteTask, { isLoading: isDeleting }] = useDeleteTaskMutation();

  const tasks = data?.tasks ?? [];

  const canManageTask = (task: TaskItem) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    const ownerId = typeof task.owner === "string" ? task.owner : task.owner?._id;
    return ownerId === user._id?.toString();
  };

  const getTaskContactId = (task: TaskItem) => {
    if (!task.contactId) return contact._id;
    return typeof task.contactId === "string" ? task.contactId : task.contactId._id;
  };

  const resetEdit = () => {
    setEditingTask(null);
  };

  const handleSaved = () => {
    resetEdit();
    setActiveTab("view-tasks");
  };

  const handleEdit = (task: TaskItem) => {
    setEditingTask(task);
    setActiveTab("add-task");
  };

  const handleStatusChange = async (task: TaskItem, status: TaskStatus) => {
    try {
      await updateTask({ id: task._id, status }).unwrap();
      toast.success("Task status updated");
    } catch (error: any) {
      toast.error(error?.data?.error || "Failed to update task status");
    }
  };

  const handleDelete = async (task: TaskItem) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;

    try {
      await deleteTask({ id: task._id, contactId: getTaskContactId(task) }).unwrap();
      toast.success("Task deleted");
      if (editingTask?._id === task._id) resetEdit();
    } catch (error: any) {
      toast.error(error?.data?.error || "Failed to delete task");
    }
  };

  return (
    <div>
      <ul className="flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:border-gray-700 dark:text-gray-400">
        <li className="me-2">
          <button
            type="button"
            onClick={() => setActiveTab("add-task")}
            className={`inline-block p-4 rounded-t-lg ${
              activeTab === "add-task"
                ? "text-blue-600 bg-gray-100 active dark:bg-gray-800 dark:text-blue-500"
                : "hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            }`}
          >
            {editingTask ? "Edit Task" : "Add Task"}
          </button>
        </li>
        <li className="me-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("view-tasks");
              resetEdit();
            }}
            className={`inline-block p-4 rounded-t-lg ${
              activeTab === "view-tasks"
                ? "text-blue-600 bg-gray-100 active dark:bg-gray-800 dark:text-blue-500"
                : "hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            }`}
          >
            View Tasks
          </button>
        </li>
      </ul>

      <div className="p-4">
        {activeTab === "add-task" && (
          <TaskForm
            contact={contact}
            editingTask={editingTask}
            onClose={onClose}
            onCancelEdit={resetEdit}
            onSaved={handleSaved}
          />
        )}

        {activeTab === "view-tasks" && (
          <div className="space-y-4">
            {isLoading && (
              <div className="flex justify-center">
                <VeryShortSpinnerPrimary />
              </div>
            )}
            {error && <p className="text-sm text-red-500">Failed to load tasks.</p>}
            {!isLoading && tasks.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No tasks linked to this contact.</p>
            )}
            {tasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                isUpdating={isUpdating}
                isDeleting={isDeleting}
                onEdit={canManageTask(task) ? handleEdit : undefined}
                onDelete={canManageTask(task) ? handleDelete : undefined}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
