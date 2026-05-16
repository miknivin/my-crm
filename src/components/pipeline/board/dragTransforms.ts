import { UniqueIdentifier } from "@dnd-kit/core";

import { Contact, DragSyncUpdate } from "../types";

export interface ResolvedDropTarget {
  contactId: string;
  sourceStageId: string;
  destinationStageId: string;
  sourceIndex: number;
  destinationIndex: number;
}

const parseContactId = (id: UniqueIdentifier | null | undefined): string | null => {
  if (!id) return null;
  const value = String(id);
  return value.startsWith("contact-") ? value.replace("contact-", "") : null;
};

const parseStageId = (id: UniqueIdentifier | null | undefined): string | null => {
  if (!id) return null;
  const value = String(id);
  return value.startsWith("stage-") ? value.replace("stage-", "") : null;
};

const getStageIdForContact = (contactId: string, source: Record<string, Contact[]>) => {
  for (const [stageId, contacts] of Object.entries(source)) {
    if (contacts.some((contact) => contact._id === contactId)) return stageId;
  }

  return null;
};

export const resolveDropTarget = (args: {
  activeId: UniqueIdentifier;
  overId: UniqueIdentifier;
  activeStageId?: string;
  contactsByStage: Record<string, Contact[]>;
}): ResolvedDropTarget | null => {
  const { activeId, overId, activeStageId, contactsByStage } = args;

  const contactId = parseContactId(activeId);
  if (!contactId) return null;

  const sourceStageId = activeStageId ?? getStageIdForContact(contactId, contactsByStage);
  if (!sourceStageId) return null;

  const sourceContacts = contactsByStage[sourceStageId] ?? [];
  const sourceIndex = sourceContacts.findIndex((contact) => contact._id === contactId);
  if (sourceIndex < 0) return null;

  let destinationStageId = parseStageId(overId);
  let destinationIndex = -1;

  if (!destinationStageId) {
    const overContactId = parseContactId(overId);
    if (!overContactId) return null;

    destinationStageId = getStageIdForContact(overContactId, contactsByStage);
    if (!destinationStageId) return null;

    destinationIndex = (contactsByStage[destinationStageId] ?? []).findIndex((contact) => contact._id === overContactId);
  }

  if (!destinationStageId) return null;

  if (destinationIndex < 0) {
    destinationIndex = (contactsByStage[destinationStageId] ?? []).length;
  }

  return {
    contactId,
    sourceStageId,
    destinationStageId,
    sourceIndex,
    destinationIndex,
  };
};

export const applyReorder = (args: {
  contacts: Contact[];
  sourceIndex: number;
  destinationIndex: number;
}): Contact[] => {
  const { contacts, sourceIndex, destinationIndex } = args;
  const reordered = [...contacts];

  const [movingContact] = reordered.splice(sourceIndex, 1);
  const adjustedIndex = sourceIndex < destinationIndex ? destinationIndex - 1 : destinationIndex;
  reordered.splice(adjustedIndex, 0, movingContact);

  return reordered;
};

export const applyMove = (args: {
  sourceContacts: Contact[];
  destinationContacts: Contact[];
  sourceIndex: number;
  destinationIndex: number;
}) => {
  const { sourceContacts, destinationContacts, sourceIndex, destinationIndex } = args;

  const nextSource = [...sourceContacts];
  const nextDestination = [...destinationContacts];

  const [movingContact] = nextSource.splice(sourceIndex, 1);
  nextDestination.splice(destinationIndex, 0, movingContact);

  return {
    sourceContacts: nextSource,
    destinationContacts: nextDestination,
  };
};

export const deriveChangedOrders = (args: {
  pipelineId: string;
  previousByStage: Record<string, Contact[]>;
  nextByStage: Record<string, Contact[]>;
  stageIds: string[];
}): DragSyncUpdate[] => {
  const updates: DragSyncUpdate[] = [];

  for (const stageId of args.stageIds) {
    const prevContacts = args.previousByStage[stageId] ?? [];
    const nextContacts = args.nextByStage[stageId] ?? [];

    for (let index = 0; index < nextContacts.length; index += 1) {
      const nextContact = nextContacts[index];
      const prevContactAtIndex = prevContacts[index];

      if (!prevContactAtIndex || prevContactAtIndex._id !== nextContact._id) {
        updates.push({
          contactId: nextContact._id,
          pipelineId: args.pipelineId,
          stageId,
          order: index + 1,
        });
      }
    }
  }

  return updates;
};
