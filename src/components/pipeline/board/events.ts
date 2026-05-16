import { Contact, DragSyncEvent, DragSyncSnapshot, Stage } from "../types";

export interface StageHydratedPayload {
  stageId: string;
  contacts: Contact[];
  total: number;
  page: number;
  limit: number;
}

export interface SyncFailurePayload {
  opIds: string[];
  error: string;
  final: boolean;
}

export type BoardAction =
  | { type: "INIT_STAGES"; payload: { stages: Stage[] } }
  | { type: "STAGE_HYDRATED"; payload: StageHydratedPayload }
  | { type: "LOAD_NEXT_PAGE_REQUESTED"; payload: { stageId: string } }
  | { type: "DRAG_STARTED"; payload: { contactId: string | null } }
  | { type: "DRAG_ENDED" }
  | {
      type: "CONTACT_REORDERED";
      payload: {
        stageId: string;
        contacts: Contact[];
      };
    }
  | {
      type: "CONTACT_MOVED";
      payload: {
        sourceStageId: string;
        destinationStageId: string;
        sourceContacts: Contact[];
        destinationContacts: Contact[];
      };
    }
  | { type: "SYNC_ENQUEUED"; payload: { events: DragSyncEvent[]; snapshot: DragSyncSnapshot } }
  | { type: "SYNC_ACKED"; payload: { opIds: string[] } }
  | { type: "SYNC_FAILED"; payload: SyncFailurePayload }
  | { type: "SYNC_REHYDRATED_FROM_STORAGE"; payload: { events: DragSyncEvent[] } }
  | { type: "SYNC_STATUS"; payload: { status: "idle" | "syncing" | "error"; error?: string } };
