import { BoardState, Contact, DragSyncSnapshot, Stage, StageMeta } from "../types";
import { BoardAction } from "./events";

const defaultMeta: StageMeta = {
  totalCount: 0,
  loadedCount: 0,
  page: 1,
  hasMore: true,
  isLoadingMore: false,
};

const createMetaMap = (stages: Stage[], previous: Record<string, StageMeta>) => {
  const next: Record<string, StageMeta> = {};
  for (const stage of stages) {
    next[stage._id] = previous[stage._id] ?? { ...defaultMeta };
  }
  return next;
};

const createContactsMap = (stages: Stage[], previous: Record<string, Contact[]>) => {
  const next: Record<string, Contact[]> = {};
  for (const stage of stages) {
    next[stage._id] = previous[stage._id] ?? [];
  }
  return next;
};

const mergeContacts = (existing: Contact[], incoming: Contact[]) => {
  const next = [...existing];
  const seen = new Set(existing.map((contact) => contact._id));
  for (const contact of incoming) {
    if (!seen.has(contact._id)) {
      next.push(contact);
      seen.add(contact._id);
    }
  }
  return next;
};

const isActiveDragInStage = (state: BoardState, stageId: string) => {
  if (!state.activeDragContactId) return false;
  const contacts = state.contactsByStage[stageId] ?? [];
  return contacts.some((contact) => contact._id === state.activeDragContactId);
};

const applySnapshotRollback = (
  state: BoardState,
  opIds: string[]
): Pick<BoardState, "contactsByStage" | "stageMetaById"> => {
  const nextContactsByStage = { ...state.contactsByStage };
  const nextStageMetaById = { ...state.stageMetaById };

  for (const opId of opIds) {
    const snapshot: DragSyncSnapshot | undefined = state.rollbackByOpId[opId];
    if (!snapshot) continue;

    for (const [stageId, contacts] of Object.entries(snapshot.contactsByStage)) {
      nextContactsByStage[stageId] = contacts;
    }

    for (const [stageId, meta] of Object.entries(snapshot.stageMetaById)) {
      nextStageMetaById[stageId] = meta;
    }
  }

  return {
    contactsByStage: nextContactsByStage,
    stageMetaById: nextStageMetaById,
  };
};

export const initialBoardState: BoardState = {
  stages: [],
  contactsByStage: {},
  stageMetaById: {},
  activeDragContactId: null,
  pendingSyncQueue: [],
  rollbackByOpId: {},
  syncStatus: "idle",
  lastSyncError: undefined,
};

export const boardReducer = (state: BoardState, action: BoardAction): BoardState => {
  switch (action.type) {
    case "INIT_STAGES": {
      const stages = action.payload.stages;
      return {
        ...state,
        stages,
        contactsByStage: createContactsMap(stages, state.contactsByStage),
        stageMetaById: createMetaMap(stages, state.stageMetaById),
      };
    }

    case "STAGE_HYDRATED": {
      const { stageId, contacts, total, page } = action.payload;
      const existingContacts = state.contactsByStage[stageId] ?? [];

      const nextStageContacts = page === 1 ? contacts : mergeContacts(existingContacts, contacts);

      if (isActiveDragInStage(state, stageId)) {
        return {
          ...state,
          stageMetaById: {
            ...state.stageMetaById,
            [stageId]: {
              ...(state.stageMetaById[stageId] ?? { ...defaultMeta }),
              totalCount: total,
              loadedCount: existingContacts.length,
              hasMore: existingContacts.length < total,
              isLoadingMore: false,
            },
          },
        };
      }

      return {
        ...state,
        contactsByStage: {
          ...state.contactsByStage,
          [stageId]: nextStageContacts,
        },
        stageMetaById: {
          ...state.stageMetaById,
          [stageId]: {
            ...(state.stageMetaById[stageId] ?? { ...defaultMeta }),
            totalCount: total,
            loadedCount: nextStageContacts.length,
            page,
            hasMore: nextStageContacts.length < total,
            isLoadingMore: false,
          },
        },
      };
    }

    case "LOAD_NEXT_PAGE_REQUESTED": {
      const { stageId } = action.payload;
      const currentMeta = state.stageMetaById[stageId] ?? { ...defaultMeta };

      if (!currentMeta.hasMore || currentMeta.isLoadingMore) return state;

      return {
        ...state,
        stageMetaById: {
          ...state.stageMetaById,
          [stageId]: {
            ...currentMeta,
            page: currentMeta.page + 1,
            isLoadingMore: true,
          },
        },
      };
    }

    case "DRAG_STARTED":
      return {
        ...state,
        activeDragContactId: action.payload.contactId,
      };

    case "DRAG_ENDED":
      return {
        ...state,
        activeDragContactId: null,
      };

    case "CONTACT_REORDERED": {
      const { stageId, contacts } = action.payload;
      const currentMeta = state.stageMetaById[stageId] ?? { ...defaultMeta };
      return {
        ...state,
        contactsByStage: {
          ...state.contactsByStage,
          [stageId]: contacts,
        },
        stageMetaById: {
          ...state.stageMetaById,
          [stageId]: {
            ...currentMeta,
            loadedCount: contacts.length,
            hasMore: contacts.length < currentMeta.totalCount,
          },
        },
      };
    }

    case "CONTACT_MOVED": {
      const { sourceStageId, destinationStageId, sourceContacts, destinationContacts } = action.payload;
      const sourceMeta = state.stageMetaById[sourceStageId] ?? { ...defaultMeta };
      const destinationMeta = state.stageMetaById[destinationStageId] ?? { ...defaultMeta };

      return {
        ...state,
        contactsByStage: {
          ...state.contactsByStage,
          [sourceStageId]: sourceContacts,
          [destinationStageId]: destinationContacts,
        },
        stageMetaById: {
          ...state.stageMetaById,
          [sourceStageId]: {
            ...sourceMeta,
            totalCount: Math.max(0, sourceMeta.totalCount - 1),
            loadedCount: sourceContacts.length,
            hasMore: sourceContacts.length < Math.max(0, sourceMeta.totalCount - 1),
          },
          [destinationStageId]: {
            ...destinationMeta,
            totalCount: destinationMeta.totalCount + 1,
            loadedCount: destinationContacts.length,
            hasMore: destinationContacts.length < destinationMeta.totalCount + 1,
          },
        },
      };
    }

    case "SYNC_ENQUEUED": {
      const rollbackByOpId = { ...state.rollbackByOpId };
      for (const event of action.payload.events) {
        rollbackByOpId[event.opId] = action.payload.snapshot;
      }

      return {
        ...state,
        pendingSyncQueue: [...state.pendingSyncQueue, ...action.payload.events],
        rollbackByOpId,
      };
    }

    case "SYNC_REHYDRATED_FROM_STORAGE":
      return {
        ...state,
        pendingSyncQueue: action.payload.events,
      };

    case "SYNC_ACKED": {
      const opIds = new Set(action.payload.opIds);
      const rollbackByOpId = { ...state.rollbackByOpId };
      for (const opId of opIds) {
        delete rollbackByOpId[opId];
      }

      return {
        ...state,
        pendingSyncQueue: state.pendingSyncQueue.filter((event) => !opIds.has(event.opId)),
        rollbackByOpId,
        syncStatus: "idle",
        lastSyncError: undefined,
      };
    }

    case "SYNC_FAILED": {
      const opIds = new Set(action.payload.opIds);
      const rollbackByOpId = { ...state.rollbackByOpId };

      if (!action.payload.final) {
        return {
          ...state,
          syncStatus: "error",
          lastSyncError: action.payload.error,
        };
      }

      const rollbackState = applySnapshotRollback(state, action.payload.opIds);
      for (const opId of opIds) {
        delete rollbackByOpId[opId];
      }

      return {
        ...state,
        ...rollbackState,
        pendingSyncQueue: state.pendingSyncQueue.filter((event) => !opIds.has(event.opId)),
        rollbackByOpId,
        syncStatus: "error",
        lastSyncError: action.payload.error,
      };
    }

    case "SYNC_STATUS":
      return {
        ...state,
        syncStatus: action.payload.status,
        lastSyncError: action.payload.error,
      };

    default:
      return state;
  }
};
