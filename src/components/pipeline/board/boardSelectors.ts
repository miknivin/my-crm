import { BoardState, Contact, StageMeta } from "../types";

const defaultStageMeta: StageMeta = {
  totalCount: 0,
  loadedCount: 0,
  page: 1,
  hasMore: true,
  isLoadingMore: false,
};

export const selectStageContacts = (state: BoardState, stageId: string): Contact[] => {
  return state.contactsByStage[stageId] ?? [];
};

export const selectStageMeta = (state: BoardState, stageId: string): StageMeta => {
  return state.stageMetaById[stageId] ?? defaultStageMeta;
};

export const selectStageView = (state: BoardState, stageId: string) => {
  return {
    contacts: selectStageContacts(state, stageId),
    meta: selectStageMeta(state, stageId),
  };
};
