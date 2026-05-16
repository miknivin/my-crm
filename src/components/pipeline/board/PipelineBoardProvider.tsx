"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { DragEndEvent, DragStartEvent, UniqueIdentifier } from "@dnd-kit/core";
import { toast } from "react-toastify";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { createStore, StoreApi } from "zustand/vanilla";

import { usePipelineDragSyncApi } from "@/app/redux/features/pipelineBoard/usePipelineDragSyncApi";

import { BoardState, Contact, DragSyncEvent, DragSyncSnapshot, DragSyncUpdate, Stage } from "../types";
import { boardReducer, initialBoardState } from "./boardReducer";
import { BoardAction } from "./events";
import { applyMove, applyReorder, deriveChangedOrders, resolveDropTarget } from "./dragTransforms";
import { useDragSyncWorker } from "./useDragSyncWorker";

interface PipelineStageInput {
  _id: string;
  name: string;
  order: number;
  probability?: number;
}

interface StageHydrateInput {
  stageId: string;
  contacts: Contact[];
  total: number;
  page: number;
  limit: number;
}

type PipelineBoardStore = BoardState & {
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  hydrateStage: (input: StageHydrateInput) => void;
  requestNextPage: (stageId: string) => void;
  dispatch: (action: BoardAction) => void;
};

interface PipelineBoardProviderProps {
  pipelineId: string;
  pipelineStages?: PipelineStageInput[];
  children: React.ReactNode;
}

const PipelineBoardStoreContext = createContext<StoreApi<PipelineBoardStore> | null>(null);

const defaultStageMeta = {
  totalCount: 0,
  loadedCount: 0,
  page: 1,
  hasMore: true,
  isLoadingMore: false,
};

const normalizeStages = (stages: PipelineStageInput[] | undefined): Stage[] => {
  if (!stages?.length) return [];
  return stages
    .map((stage) => ({
      _id: stage._id,
      name: stage.name,
      order: stage.order,
      probability: stage.probability ?? 0,
    }))
    .sort((a, b) => a.order - b.order);
};

const parseContactId = (id: UniqueIdentifier | null | undefined): string | null => {
  if (!id) return null;
  const value = String(id);
  return value.startsWith("contact-") ? value.replace("contact-", "") : null;
};

const buildSnapshot = (state: BoardState, stageIds: string[]): DragSyncSnapshot => {
  const contactsByStage: Record<string, Contact[]> = {};
  const stageMetaById: Record<string, BoardState["stageMetaById"][string]> = {};

  for (const stageId of stageIds) {
    contactsByStage[stageId] = [...(state.contactsByStage[stageId] ?? [])];
    const meta = state.stageMetaById[stageId];
    if (meta) stageMetaById[stageId] = { ...meta };
  }

  return {
    contactsByStage,
    stageMetaById,
  };
};

const createSyncEvents = (updates: DragSyncUpdate[]): DragSyncEvent[] => {
  const now = Date.now();
  return updates.map((update, index) => ({
    opId: `${now}-${index}-${update.contactId}-${update.stageId}`,
    update,
    createdAt: now,
  }));
};

const createPipelineBoardStore = (pipelineId: string) =>
  createStore<PipelineBoardStore>((set, get) => {
    const dispatch = (action: BoardAction) => {
      set((state) => boardReducer(state, action));
    };

    return {
      ...initialBoardState,
      dispatch,
      hydrateStage: (input) => {
        dispatch({ type: "STAGE_HYDRATED", payload: input });
      },
      requestNextPage: (stageId) => {
        dispatch({ type: "LOAD_NEXT_PAGE_REQUESTED", payload: { stageId } });
      },
      handleDragStart: (event) => {
        const contactId = parseContactId(event.active.id);
        dispatch({ type: "DRAG_STARTED", payload: { contactId } });
      },
      handleDragEnd: (event) => {
        const { active, over } = event;
        if (!over) {
          dispatch({ type: "DRAG_ENDED" });
          return;
        }

        const previousState = get();
        const resolved = resolveDropTarget({
          activeId: active.id,
          overId: over.id,
          activeStageId: active.data.current?.stageId,
          contactsByStage: previousState.contactsByStage,
        });

        if (!resolved) {
          dispatch({ type: "DRAG_ENDED" });
          return;
        }

        const { sourceStageId, destinationStageId, sourceIndex, destinationIndex } = resolved;

        if (sourceStageId === destinationStageId && sourceIndex === destinationIndex) {
          dispatch({ type: "DRAG_ENDED" });
          return;
        }

        const previousByStage = previousState.contactsByStage;
        const nextByStage = { ...previousByStage };
        const changedStageIds =
          sourceStageId === destinationStageId ? [sourceStageId] : [sourceStageId, destinationStageId];

        if (sourceStageId === destinationStageId) {
          const reordered = applyReorder({
            contacts: previousByStage[sourceStageId] ?? [],
            sourceIndex,
            destinationIndex,
          });

          nextByStage[sourceStageId] = reordered;
          dispatch({
            type: "CONTACT_REORDERED",
            payload: { stageId: sourceStageId, contacts: reordered },
          });
        } else {
          const moved = applyMove({
            sourceContacts: previousByStage[sourceStageId] ?? [],
            destinationContacts: previousByStage[destinationStageId] ?? [],
            sourceIndex,
            destinationIndex,
          });

          nextByStage[sourceStageId] = moved.sourceContacts;
          nextByStage[destinationStageId] = moved.destinationContacts;
          dispatch({
            type: "CONTACT_MOVED",
            payload: {
              sourceStageId,
              destinationStageId,
              sourceContacts: moved.sourceContacts,
              destinationContacts: moved.destinationContacts,
            },
          });
        }

        const updates = deriveChangedOrders({
          pipelineId,
          previousByStage,
          nextByStage,
          stageIds: changedStageIds,
        });

        if (updates.length > 0) {
          const snapshot = buildSnapshot(previousState, changedStageIds);
          const events = createSyncEvents(updates);

          dispatch({
            type: "SYNC_ENQUEUED",
            payload: {
              events,
              snapshot,
            },
          });
        }

        dispatch({ type: "DRAG_ENDED" });
      },
    };
  });

export function PipelineBoardProvider({ pipelineId, pipelineStages, children }: PipelineBoardProviderProps) {
  const storeRef = useRef<StoreApi<PipelineBoardStore> | null>(null);
  if (!storeRef.current) {
    storeRef.current = createPipelineBoardStore(pipelineId);
  }

  const store = storeRef.current;
  const { executeBatchUpdate, executeBatchUpdateKeepAlive } = usePipelineDragSyncApi();
  const queue = useStore(store, (state) => state.pendingSyncQueue);
  const dispatch = useStore(store, (state) => state.dispatch);
  const syncError = useStore(
    store,
    useShallow((state) => ({
      status: state.syncStatus,
      message: state.lastSyncError,
    }))
  );

  useEffect(() => {
    const stages = normalizeStages(pipelineStages);
    dispatch({ type: "INIT_STAGES", payload: { stages } });
  }, [dispatch, pipelineStages]);

  useDragSyncWorker({
    pipelineId,
    queue,
    dispatch,
    executeBatchUpdate,
    executeBatchUpdateKeepAlive,
  });

  useEffect(() => {
    if (syncError.status !== "error" || !syncError.message) return;
    toast.error("Pipeline sync failed. Latest changes were reverted.");
  }, [syncError.message, syncError.status]);

  return <PipelineBoardStoreContext.Provider value={store}>{children}</PipelineBoardStoreContext.Provider>;
}

function usePipelineBoardStore<T>(selector: (state: PipelineBoardStore) => T): T {
  const store = useContext(PipelineBoardStoreContext);
  if (!store) {
    throw new Error("Pipeline board hooks must be used within PipelineBoardProvider");
  }
  return useStore(store, selector);
}

export function useBoardActions() {
  return usePipelineBoardStore(
    useShallow((state) => ({
      handleDragStart: state.handleDragStart,
      handleDragEnd: state.handleDragEnd,
      hydrateStage: state.hydrateStage,
      requestNextPage: state.requestNextPage,
    }))
  );
}

export function usePipelineStages() {
  return usePipelineBoardStore((state) => state.stages);
}

export function useStageView(stageId: string) {
  return usePipelineBoardStore(
    useShallow((state) => ({
      contacts: state.contactsByStage[stageId] ?? [],
      meta: state.stageMetaById[stageId] ?? defaultStageMeta,
    }))
  );
}

export function useActiveContact() {
  return usePipelineBoardStore((state) => {
    if (!state.activeDragContactId) return null;

    for (const contacts of Object.values(state.contactsByStage)) {
      const found = contacts.find((contact) => contact._id === state.activeDragContactId);
      if (found) return found;
    }

    return null;
  });
}
