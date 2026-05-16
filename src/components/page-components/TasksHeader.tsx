"use client";

import type { ChangeEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import Button from "@/components/ui/button/Button";
import TaskOffCanvas from "@/components/ui/drawer/TaskOffCanvas";
import FilterIcons from "@/components/ui/flowbiteIcons/Filter";
import { Modal } from "@/components/ui/modal";
import TaskForm from "@/components/pipeline/TaskForm";
import { useModal } from "@/hooks/useModal";

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

export default function TasksHeader() {
  const { isOpen, openModal, closeModal } = useModal();
  const {
    isOpen: isAddTaskOpen,
    openModal: openAddTaskModal,
    closeModal: closeAddTaskModal,
  } = useModal();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasActiveFilters = [
    "contactId",
    "assignedTo",
    "status",
    "dueStartDate",
    "dueEndDate",
    "updatedStartDate",
    "updatedEndDate",
  ].some((key) => Boolean(searchParams.get(key)));
  const currentStatus = searchParams.get("status") || "";

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = new URLSearchParams(searchParams.toString());
    if (event.target.value) {
      next.set("status", event.target.value);
    } else {
      next.delete("status");
    }
    next.delete("page");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <>
      <div className="my-5 flex w-full flex-col items-start justify-between gap-2 lg:flex-row lg:items-center">
        <h3 className="text-start text-lg font-semibold text-gray-800 dark:text-white/90">Tasks</h3>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={currentStatus}
            onChange={handleStatusChange}
            className="h-9 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            aria-label="Filter tasks by status"
          >
            {statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" endIcon={<FilterIcons />} onClick={openModal}>
            <div className="flex items-center gap-1.5">
              {hasActiveFilters && <span className="h-3 w-3 rounded-full bg-emerald-500" />}
              Filter
            </div>
          </Button>
          <Button size="sm" onClick={openAddTaskModal}>
            Add Task
          </Button>
        </div>
      </div>
      <TaskOffCanvas isOpen={isOpen} onClose={closeModal} />
      <Modal isOpen={isAddTaskOpen} onClose={closeAddTaskModal} className="mx-4 max-w-2xl p-5 lg:p-8">
        <div className="mb-5 pr-12">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">Add Task</h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create a custom task, with or without a linked contact.
          </p>
        </div>
        <TaskForm
          contact={null}
          editingTask={null}
          onClose={closeAddTaskModal}
          onCancelEdit={closeAddTaskModal}
          onSaved={closeAddTaskModal}
        />
      </Modal>
    </>
  );
}
