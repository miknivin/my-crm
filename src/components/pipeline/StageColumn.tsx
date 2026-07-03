"use client";

import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import {
  GetContactsByStageParams,
  useGetContactsByStageQuery,
} from "@/app/redux/api/pipelineApi";
import ShortSpinnerPrimary from "@/components/ui/loaders/ShortSpinnerPrimary";
import { Modal } from "@/components/ui/modal";
import QRCodeModalContent from "@/components/qr-code/QRCodeModalContent";
import GenerateProposalForm from "@/components/form/proposal-form/GenerateProposalForm";

import SortableContact from "./SortableContact";
import SortableStage from "./SortableStage";
import TaskTabs from "./TaskTabs";
import { useBoardActions, useStageView } from "./board/PipelineBoardProvider";
import { Contact, Stage } from "./types";

interface StageColumnProps {
  stage: Stage;
  pipelineId: string;
  filters: Omit<GetContactsByStageParams, "pipelineId" | "stageId" | "page" | "limit">;
  isFinalThree: boolean;
}

const normalizeContact = (contact: Contact): Contact => ({
  ...contact,
  assignedTo: contact.assignedTo?.map((entry) => ({
    ...entry,
    user: {
      _id: entry.user?._id ?? "",
      name: entry.user?.name ?? "",
      email: entry.user?.email ?? "",
    },
    time: new Date(entry.time).toISOString(),
  })),
});

interface ContactListProps {
  contacts: Contact[];
  sortableData: { stageId: string };
  onOpenTask: (contact: Contact) => void;
  onOpenProposal: (contact: Contact) => void;
  onOpenQR: (contact: Contact) => void;
}

// Always virtualized, regardless of how many contacts this one column has
// loaded. dnd-kit's collision detection measures every registered droppable
// across the WHOLE board on every drag, not just the active column — so
// even columns with a "small" per-column count (e.g. the default 10-per-page
// first load × 10+ columns) add up to the same DOM-measurement cost that
// caused multi-hundred-ms drag-start/cross-column blocking. A per-column
// threshold can never fix a board-wide aggregate problem.
interface VirtualizedContactListProps extends ContactListProps {
  scrollElementRef: React.RefObject<HTMLDivElement | null>;
}

const VirtualizedContactList = memo(function VirtualizedContactList({
  contacts,
  sortableData,
  onOpenTask,
  onOpenProposal,
  onOpenQR,
  scrollElementRef,
}: VirtualizedContactListProps) {
  const virtualizer = useVirtualizer({
    count: contacts.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 130,
    overscan: 2,
    gap: 8,
    getItemKey: (index) => contacts[index]._id,
  });

  const contactIds = useMemo(() => contacts.map((contact) => `contact-${contact._id}`), [contacts]);

  return (
    <SortableContext items={contactIds} strategy={verticalListSortingStrategy}>
      <div
        className="px-2 pb-3"
        style={{ position: "relative", height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const contact = contacts[virtualRow.index];
          return (
            <div
              key={contact._id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                // A real `top` offset (not `transform: translateY`) — dnd-kit
                // measures droppables via getTransformAgnosticClientRect(),
                // which explicitly *undoes* CSS transforms before treating
                // them as the element's true rect (assuming transforms are
                // only used for transient drag animation). Since this is our
                // permanent row-positioning mechanism, translateY caused
                // every virtualized card to measure as the same collapsed
                // rect, making same-column collision detection unable to
                // tell cards apart.
                top: virtualRow.start,
                left: 0,
                width: "100%",
              }}
            >
              <SortableContact
                contact={contact}
                data={sortableData}
                onOpenTask={onOpenTask}
                onOpenProposal={onOpenProposal}
                onOpenQR={onOpenQR}
              />
            </div>
          );
        })}
      </div>
    </SortableContext>
  );
});

function StageColumnComponent({ stage, pipelineId, filters, isFinalThree }: StageColumnProps) {
  const { contacts, meta } = useStageView(stage._id);
  const { hydrateStage, requestNextPage } = useBoardActions();
  const [taskContact, setTaskContact] = useState<Contact | null>(null);
  const [proposalContact, setProposalContact] = useState<Contact | null>(null);
  const [qrContact, setQrContact] = useState<Contact | null>(null);

  const limit = 10;
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const queryArgs = useMemo<GetContactsByStageParams>(
    () => ({
      pipelineId,
      stageId: stage._id,
      page: meta.page,
      limit,
      ...filters,
    }),
    [pipelineId, stage._id, meta.page, filters]
  );

  const { data, isFetching, isLoading } = useGetContactsByStageQuery(queryArgs, {
    skip: !pipelineId || !stage._id,
  });

  const latestSignatureRef = useRef<string>("");

  useEffect(() => {
    if (!data) return;

    const hydratedContacts = (data.contacts ?? []).map((c) => normalizeContact(c as unknown as Contact));
    const signature = `${meta.page}|${data.total}|${hydratedContacts.map((c) => c._id).join(",")}`;

    if (latestSignatureRef.current === signature) return;
    latestSignatureRef.current = signature;

    hydrateStage({
      stageId: stage._id,
      contacts: hydratedContacts,
      total: data.total,
      page: meta.page,
      limit,
    });
  }, [data, hydrateStage, limit, meta.page, stage._id]);

  const sortableData = useMemo(() => ({ stageId: stage._id }), [stage._id]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || isLoading || isFetching || !meta.hasMore || meta.isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        requestNextPage(stage._id);
      },
      { rootMargin: "300px 0px 300px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isFetching, isLoading, meta.hasMore, meta.isLoadingMore, requestNextPage, stage._id]);

  return (
    <SortableStage ref={scrollContainerRef} stage={stage} count={meta.totalCount} isFinalThree={isFinalThree}>
      {isLoading || (isFetching && contacts.length === 0) ? (
        <div className="flex justify-center py-10">
          <ShortSpinnerPrimary />
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-10 text-gray-500 text-sm">No contacts</div>
      ) : (
        <VirtualizedContactList
          contacts={contacts}
          sortableData={sortableData}
          onOpenTask={setTaskContact}
          onOpenProposal={setProposalContact}
          onOpenQR={setQrContact}
          scrollElementRef={scrollContainerRef}
        />
      )}

      <div ref={loadMoreRef} className="h-2" aria-hidden />
      {(isFetching || meta.isLoadingMore) && contacts.length > 0 && (
        <div className="py-3 text-center text-xs text-gray-500 dark:text-gray-400">Loading more...</div>
      )}

      <Modal isOpen={!!qrContact} onClose={() => setQrContact(null)} className="max-w-[400px] p-6">
        {qrContact && <QRCodeModalContent contact={qrContact} onClose={() => setQrContact(null)} />}
      </Modal>
      <Modal isOpen={!!taskContact} onClose={() => setTaskContact(null)} className="max-w-[600px] p-6">
        {taskContact && <TaskTabs contact={taskContact} onClose={() => setTaskContact(null)} />}
      </Modal>
      <Modal isOpen={!!proposalContact} onClose={() => setProposalContact(null)} className="max-w-[700px] p-6 lg:p-10">
        {proposalContact && (
          <GenerateProposalForm
            contact={{ _id: proposalContact._id, name: proposalContact.name || "Client" }}
            onClose={() => setProposalContact(null)}
          />
        )}
      </Modal>
    </SortableStage>
  );
}

export default memo(StageColumnComponent);
