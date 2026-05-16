"use client";

import TaskFilterForm from "@/components/form/taskFilter/TaskFilterForm";

interface TaskOffCanvasProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TaskOffCanvas({ isOpen, onClose }: TaskOffCanvasProps) {
  return <TaskFilterForm isOpen={isOpen} onClose={onClose} />;
}
