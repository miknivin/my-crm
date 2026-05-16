/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/usePipelineDragAndDrop.ts
import { useState, useCallback } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { toast } from "react-toastify";
import { BatchUpdate, Contact, Stage } from "@/components/pipeline";


interface UsePipelineDragAndDropProps {
  pipelineId: string;
  localStages: Stage[];
  setLocalStages: React.Dispatch<React.SetStateAction<Stage[]>>;
  localContacts: Record<string, Contact[]>;
  setLocalContacts: React.Dispatch<React.SetStateAction<Record<string, Contact[]>>>;
  pendingUpdates: BatchUpdate[];
  setPendingUpdates: React.Dispatch<React.SetStateAction<BatchUpdate[]>>;
  saveUpdatesToIndexedDB: (updates: BatchUpdate[]) => Promise<void>;
  mergeUpdates: (newUpdates: BatchUpdate[], prevUpdates: BatchUpdate[]) => BatchUpdate[];
}

export function usePipelineDragAndDrop({
  pipelineId,
  localStages,
  setLocalStages,
  localContacts,
  setLocalContacts,
  pendingUpdates,
  setPendingUpdates,
  saveUpdatesToIndexedDB,
  mergeUpdates,
}: UsePipelineDragAndDropProps) {
  const [draggedContact, setDraggedContact] = useState<Contact | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback(
    (event: any) => {
      if (!event.active.id.startsWith("contact-")) return;

      const contactId = event.active.id.replace("contact-", "");
      const stageId = event.active.data.current?.stageId as string | undefined;

      if (!stageId) return;

      const contact = localContacts[stageId]?.find((c) => c._id === contactId);
      if (contact) {
        setDraggedContact(contact);
      }
    },
    [localContacts]
  );

  const handleDragEnd = useCallback(
    (event: any) => {
      setDraggedContact(null);

      const { active, over } = event;
      if (!over) return;

      // ── Stage reordering ───────────────────────────────────────────────
      if (active.id.startsWith("stage-")) {
        const activeStageId = active.id.replace("stage-", "");
        const overStageId = over.id.replace("stage-", "");

        if (activeStageId === overStageId) return;

        const oldIndex = localStages.findIndex((s) => s._id === activeStageId);
        const newIndex = localStages.findIndex((s) => s._id === overStageId);

        if (oldIndex === -1 || newIndex === -1) return;

        const newStages = [...localStages];
        const [movedStage] = newStages.splice(oldIndex, 1);
        newStages.splice(newIndex, 0, movedStage);

        const updatedStages = newStages.map((stage, idx) => ({
          ...stage,
          order: idx + 1,
        }));

        setLocalStages(updatedStages);
        return;
      }

      // ── Contact drag ───────────────────────────────────────────────────
      if (!active.id.startsWith("contact-")) return;

      const contactId = active.id.replace("contact-", "");
      const sourceStageId = active.data.current?.stageId as string | undefined;

      const destinationStageId: string | undefined = over.id.startsWith("stage-")
        ? over.id.replace("stage-", "")
        : over.data.current?.stageId;

      if (!sourceStageId || !destinationStageId) return;

      // Same stage → reorder
      if (sourceStageId === destinationStageId) {
        const contacts = [...(localContacts[sourceStageId] || [])];
        const oldIndex = contacts.findIndex((c) => c._id === contactId);
        if (oldIndex === -1) return;

        const newIndex = over.id.startsWith("contact-")
          ? contacts.findIndex((c) => c._id === over.id.replace("contact-", ""))
          : contacts.length;

        if (oldIndex === newIndex || newIndex === -1) return;

        const [movedContact] = contacts.splice(oldIndex, 1);
        contacts.splice(newIndex, 0, movedContact);

        setLocalContacts((prev) => ({
          ...prev,
          [sourceStageId]: contacts,
        }));

        const updates = contacts.map((c, idx) => ({
          contactId: c._id,
          pipelineId,
          stageId: sourceStageId,
          order: idx + 1,
        }));

        const merged = mergeUpdates(updates, pendingUpdates);
        setPendingUpdates(merged);
        saveUpdatesToIndexedDB(merged).catch((err) => {
          console.error("Failed to save drag update to IndexedDB", err);
          toast.error("Failed to queue drag update");
        });

        return;
      }

      // Different stage → move
      const sourceContacts = [...(localContacts[sourceStageId] || [])];
      const destContacts = [...(localContacts[destinationStageId] || [])];

      const contactIndex = sourceContacts.findIndex((c) => c._id === contactId);
      if (contactIndex === -1) return;

      const [movedContact] = sourceContacts.splice(contactIndex, 1);

      const newIndex = over.id.startsWith("contact-")
        ? destContacts.findIndex((c) => c._id === over.id.replace("contact-", ""))
        : destContacts.length;

      destContacts.splice(newIndex >= 0 ? newIndex : destContacts.length, 0, movedContact);

      setLocalContacts((prev) => ({
        ...prev,
        [sourceStageId]: sourceContacts,
        [destinationStageId]: destContacts,
      }));

      // Only update order for the destination stage
      const updates = destContacts.map((c, idx) => ({
        contactId: c._id,
        pipelineId,
        stageId: destinationStageId,
        order: idx + 1,
      }));

      const merged = mergeUpdates(updates, pendingUpdates);
      setPendingUpdates(merged);
      saveUpdatesToIndexedDB(merged).catch((err) => {
        console.error("Failed to save cross-stage move to IndexedDB", err);
        toast.error("Failed to queue contact move");
      });
    },
    [
      localStages,
      setLocalStages,
      localContacts,
      setLocalContacts,
      pipelineId,
      pendingUpdates,
      setPendingUpdates,
      saveUpdatesToIndexedDB,
      mergeUpdates,
    ]
  );

  return {
    sensors,
    draggedContact,
    handleDragStart,
    handleDragEnd,
  };
}