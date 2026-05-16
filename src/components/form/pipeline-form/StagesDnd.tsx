"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Define interfaces
export interface StageDrop {
  id: string;
  name: string;
  order: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  probability?:any | 0.5;
}

interface StageItemProps {
  stage: StageDrop;
  onRemove: (name: string) => void;
}

// Draggable StageDrop Item Component using dnd-kit
const StageItem = ({ stage, onRemove }: StageItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white/90 cursor-move"
    >
      <span>{stage.name}</span>
      <button
        type="button"
        onClick={() => onRemove(stage.name)}
        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        aria-label={`Remove ${stage.name}`}
      >
        ×
      </button>
    </div>
  );
};

// StageDrop List Component
interface StageListProps {
  stages: StageDrop[];
  setStages: (stages: StageDrop[]) => void;
  handleStageRemove: (name: string) => void;
}

export default function StageList({ stages, setStages, handleStageRemove }: StageListProps) {
  const sensors = useSensors(useSensor(PointerSensor));

  // Ensure stages are initially sorted by order
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = sortedStages.findIndex((s) => s.id === active.id);
      const newIndex = sortedStages.findIndex((s) => s.id === over?.id);
      const reordered = arrayMove(sortedStages, oldIndex, newIndex).map((s, idx) => ({
        ...s,
        order: idx + 1,
      }));
      setStages(reordered);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sortedStages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 mb-2">
          {sortedStages.map((stage) => (
            <StageItem key={stage.id} stage={stage} onRemove={handleStageRemove} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
