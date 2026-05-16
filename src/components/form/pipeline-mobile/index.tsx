/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

import { useBatchUpdateContactDragMutation } from "@/app/redux/api/contactApi";
import {
  useLazyGetContactsByPipelineQuery,
  useGetPipelineByIdQuery,
  useGetStagesByPipelineIdQuery,
  useLazyGetContactsByStageQuery,
} from "@/app/redux/api/pipelineApi";
import Button from "@/components/ui/button/Button";
import PipelineOffCanvas from "@/components/ui/drawer/PipelineOffCanvas";
import FilterIcons from "@/components/ui/flowbiteIcons/Filter";
import ShortSpinnerPrimary from "@/components/ui/loaders/ShortSpinnerPrimary";
import { useModal } from "@/hooks/useModal";

import MobileContactCard from "./MobileContactCard";

interface User {
  _id: string;
  name: string;
  email: string;
}

interface AssignedTo {
  user: User;
  time: string;
}

interface Tag {
  user: string;
  name: string;
}

interface Contact {
  _id: string;
  name: string;
  email: string;
  phone: string;
  businessName?: string;
  assignedTo?: AssignedTo[];
  probability?: number;
  tags?: Tag[];
  stageId?: string;
}

interface Stage {
  _id: string;
  name: string;
  order: number;
  probability: number;
}

interface BatchUpdate {
  contactId: string;
  pipelineId: string;
  stageId: string;
  order: number;
}

interface StagePageState {
  page: number;
  total: number;
  hasMore: boolean;
  isLoading: boolean;
}

const PAGE_SIZE = 10;

const dedupeById = (contacts: Contact[]) => {
  const seen = new Set<string>();
  return contacts.filter((contact) => {
    if (seen.has(contact._id)) return false;
    seen.add(contact._id);
    return true;
  });
};

export default function MobilePipelineBody({ pipelineId }: { pipelineId: string }) {
  const defaultStageId = process.env.NEXT_PUBLIC_DEFAULT_STAGE || "";

  const { data: pipelineData, error, isLoading: isPipelineLoading } = useGetPipelineByIdQuery(pipelineId, {
    skip: !pipelineId,
  });
  const { data: stagesData, isLoading: isStagesLoading } = useGetStagesByPipelineIdQuery(pipelineId, {
    skip: !pipelineId,
  });

  const [triggerFetch] = useLazyGetContactsByStageQuery();
  const [triggerFetchAll] = useLazyGetContactsByPipelineQuery();
  const [batchUpdateContactDrag, { isLoading: isBatchUpdating }] = useBatchUpdateContactDragMutation();

  const [localStages, setLocalStages] = useState<Stage[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>(defaultStageId || "all");
  const [contactsByStage, setContactsByStage] = useState<Record<string, Contact[]>>({});
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [stagePageState, setStagePageState] = useState<Record<string, StagePageState>>({});
  const [allPageState, setAllPageState] = useState<StagePageState>({
    page: 1,
    total: 0,
    hasMore: true,
    isLoading: false,
  });
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadMoreLockRef = useRef(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { isOpen: isFilterOpen, openModal: openFilter, closeModal: closeFilter } = useModal();

  const hasActiveFilters = !!(
    searchParams.get("keyword") ||
    searchParams.get("source") ||
    searchParams.get("assignedTo") ||
    searchParams.get("startDate") ||
    searchParams.get("endDate")
  );

  const filters = useMemo(
    () => ({
      keyword: searchParams.get("keyword") || undefined,
      source: searchParams.get("source") || undefined,
      assignedTo: searchParams.get("assignedTo") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      activities: searchParams.get("activities") || undefined,
    }),
    [searchParams]
  );

  useEffect(() => {
    const sourceStages = stagesData?.data?.length
      ? stagesData.data
      : (pipelineData?.pipeline?.stages ?? []);

    if (!sourceStages.length) return;

    const nextStages = [...sourceStages].sort((a, b) => a.order - b.order);
    setLocalStages(nextStages as Stage[]);
  }, [pipelineData?.pipeline?.stages, stagesData?.data]);

  useEffect(() => {
    if (localStages.length === 0) return;

    const stageFromUrl = searchParams.get("stage-mobile");

    if (stageFromUrl === "all") {
      setSelectedStage((prev) => (prev === "all" ? prev : "all"));
      return;
    }

    if (stageFromUrl && localStages.some((stage) => stage._id === stageFromUrl)) {
      setSelectedStage((prev) => (prev === stageFromUrl ? prev : stageFromUrl));
      return;
    }

    const fallback =
      defaultStageId && localStages.some((stage) => stage._id === defaultStageId)
        ? defaultStageId
        : localStages[0]?._id ?? "all";

    setSelectedStage((prev) => (prev === fallback ? prev : fallback));
  }, [defaultStageId, localStages, searchParams]);

  const fetchStageContacts = useCallback(
    async (stageId: string, page: number, append: boolean) => {
      setStagePageState((prev) => ({
        ...prev,
        [stageId]: {
          ...(prev[stageId] ?? { page: 1, total: 0, hasMore: true, isLoading: false }),
          isLoading: true,
        },
      }));

      try {
        const result = await triggerFetch({
          pipelineId,
          stageId,
          ...filters,
          page,
          limit: PAGE_SIZE,
        }).unwrap();

        const mappedContacts: Contact[] = (result.contacts ?? []).map((contact: any) => ({
          _id: contact._id,
          name: contact.name || "Unnamed",
          email: contact.email || "No email",
          businessName: contact.businessName || "Nil",
          phone: contact.phone || "No phone",
          assignedTo: contact.assignedTo || [],
          probability: contact.probability || 50,
          stageId,
          tags: contact.tags || [],
        }));

        let loadedCount = mappedContacts.length;
        setContactsByStage((prev) => {
          const current = prev[stageId] ?? [];
          const nextStageContacts = append ? dedupeById([...current, ...mappedContacts]) : mappedContacts;
          loadedCount = nextStageContacts.length;
          return { ...prev, [stageId]: nextStageContacts };
        });

        setStagePageState((prev) => {
          const total = result.total ?? prev[stageId]?.total ?? 0;
          return {
            ...prev,
            [stageId]: {
              page,
              total,
              hasMore: loadedCount < total,
              isLoading: false,
            },
          };
        });
      } catch (fetchError) {
        console.error(`Failed to fetch contacts for stage ${stageId}`, fetchError);
        setStagePageState((prev) => ({
          ...prev,
          [stageId]: {
            ...(prev[stageId] ?? { page: 1, total: 0, hasMore: false, isLoading: false }),
            isLoading: false,
          },
        }));
      }
    },
    [filters, pipelineId, triggerFetch]
  );

  const fetchAllContacts = useCallback(
    async (page: number, append: boolean) => {
      setAllPageState((prev) => ({ ...prev, isLoading: true }));

      try {
        const result = await triggerFetchAll({
          pipelineId,
          ...filters,
          page,
          limit: PAGE_SIZE,
        }).unwrap();

        const mappedContacts: Contact[] = (result.contacts ?? []).map((contact: any) => ({
          _id: contact._id,
          name: contact.name || "Unnamed",
          email: contact.email || "No email",
          businessName: contact.businessName || "Nil",
          phone: contact.phone || "No phone",
          assignedTo: contact.assignedTo || [],
          probability: contact.probability || 50,
          stageId: contact.pipelinesActive?.[0]?.stage_id,
          tags: contact.tags || [],
        }));

        setAllContacts((prev) => {
          const next = append ? dedupeById([...prev, ...mappedContacts]) : mappedContacts;
          setAllPageState({
            page,
            total: result.total ?? 0,
            hasMore: next.length < (result.total ?? 0),
            isLoading: false,
          });
          return next;
        });
      } catch (fetchError) {
        console.error("Failed to fetch contacts for all stages", fetchError);
        setAllPageState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [filters, pipelineId, triggerFetchAll]
  );

  useEffect(() => {
    if (!pipelineId || localStages.length === 0 || !selectedStage) return;

    setIsBootstrapping(true);
    if (selectedStage === "all") {
      setContactsByStage({});
      fetchAllContacts(1, false).finally(() => setIsBootstrapping(false));
      return;
    }

    if (!localStages.some((stage) => stage._id === selectedStage)) {
      setIsBootstrapping(false);
      return;
    }

    setAllContacts([]);
    setAllPageState({ page: 1, total: 0, hasMore: true, isLoading: false });
    fetchStageContacts(selectedStage, 1, false).finally(() => setIsBootstrapping(false));
  }, [fetchAllContacts, fetchStageContacts, localStages, pipelineId, selectedStage]);

  const localContacts = useMemo(() => {
    if (selectedStage === "all") {
      return allContacts;
    }

    return contactsByStage[selectedStage] ?? [];
  }, [allContacts, contactsByStage, selectedStage]);

  const totalForSelected = useMemo(() => {
    if (selectedStage === "all") {
      return allPageState.total;
    }
    return stagePageState[selectedStage]?.total ?? 0;
  }, [allPageState.total, selectedStage, stagePageState]);

  const canLoadMore = useMemo(() => {
    if (selectedStage === "all") return allPageState.hasMore;
    return stagePageState[selectedStage]?.hasMore ?? false;
  }, [allPageState.hasMore, selectedStage, stagePageState]);

  const isLoadingMore = useMemo(() => {
    if (selectedStage === "all") return allPageState.isLoading;
    return stagePageState[selectedStage]?.isLoading ?? false;
  }, [allPageState.isLoading, selectedStage, stagePageState]);

  const loadMore = useCallback(async () => {
    if (selectedStage === "all") {
      if (!allPageState.hasMore || allPageState.isLoading) return;
      await fetchAllContacts(allPageState.page + 1, true);
      return;
    }

    const meta = stagePageState[selectedStage];
    if (!meta || !meta.hasMore || meta.isLoading) return;
    await fetchStageContacts(selectedStage, meta.page + 1, true);
  }, [allPageState.hasMore, allPageState.isLoading, allPageState.page, fetchAllContacts, fetchStageContacts, selectedStage, stagePageState]);

  useEffect(() => {
    if (!isLoadingMore) {
      loadMoreLockRef.current = false;
    }
  }, [isLoadingMore]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !canLoadMore || isLoadingMore || isBatchUpdating) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || loadMoreLockRef.current) return;

        loadMoreLockRef.current = true;
        loadMore().catch((err) => {
          console.error("Auto load more failed", err);
          loadMoreLockRef.current = false;
        });
      },
      { rootMargin: "250px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [canLoadMore, isBatchUpdating, isLoadingMore, loadMore, selectedStage]);

  const handleStageChange = useCallback(
    async (contactId: string, newStageId: string) => {
      const currentContact = localContacts.find((contact) => contact._id === contactId);
      if (!currentContact || !currentContact.stageId || currentContact.stageId === newStageId) return;

      const oldStageId = currentContact.stageId;

      setContactsByStage((prev) => {
        const sourceContacts = [...(prev[oldStageId] ?? [])].filter((c) => c._id !== contactId);
        const destinationContacts = [...(prev[newStageId] ?? []), { ...currentContact, stageId: newStageId }];

        return {
          ...prev,
          [oldStageId]: sourceContacts,
          [newStageId]: destinationContacts,
        };
      });

      try {
        await batchUpdateContactDrag({
          updates: [
            {
              contactId,
              pipelineId,
              stageId: newStageId,
              order: 1,
            },
          ],
        }).unwrap();

        await Promise.all([fetchStageContacts(oldStageId, 1, false), fetchStageContacts(newStageId, 1, false)]);
      } catch (updateError) {
        console.error("Failed to move contact stage", updateError);
        toast.error("Failed to move contact");
        await Promise.all([fetchStageContacts(oldStageId, 1, false), fetchStageContacts(newStageId, 1, false)]);
      }
    },
    [batchUpdateContactDrag, fetchStageContacts, localContacts, pipelineId]
  );

  const handleDragEnd = useCallback(
    async (event: any) => {
      if (selectedStage === "all") return;

      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const stageId = selectedStage;
      const stageContacts = [...(contactsByStage[stageId] ?? [])];

      const activeId = String(active.id).replace("contact-", "");
      const overId = String(over.id).replace("contact-", "");

      const oldIndex = stageContacts.findIndex((contact) => contact._id === activeId);
      const newIndex = stageContacts.findIndex((contact) => contact._id === overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

      const [moved] = stageContacts.splice(oldIndex, 1);
      stageContacts.splice(newIndex, 0, moved);

      setContactsByStage((prev) => ({
        ...prev,
        [stageId]: stageContacts,
      }));

      const updates: BatchUpdate[] = stageContacts.map((contact, index) => ({
        contactId: contact._id,
        pipelineId,
        stageId,
        order: index + 1,
      }));

      try {
        await batchUpdateContactDrag({ updates }).unwrap();
      } catch (dragError) {
        console.error("Failed to update contact order", dragError);
        toast.error("Failed to update contact order");
        await fetchStageContacts(stageId, 1, false);
      }
    },
    [batchUpdateContactDrag, contactsByStage, fetchStageContacts, pipelineId, selectedStage]
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleStageSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStage = e.target.value;
    setSelectedStage(newStage);

    const current = new URLSearchParams(searchParams.toString());
    current.set("stage-mobile", newStage);

    const newUrl = `${window.location.pathname}?${current.toString()}`;
    router.replace(newUrl, { scroll: false });
  };

  return (
    <div className="min-h-screen rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mx-auto w-full relative">
        {isPipelineLoading && (
          <div className="flex justify-center py-4">
            <ShortSpinnerPrimary />
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500 dark:text-red-400">
            Error: {(error as any).data?.error || "Failed to fetch pipeline"}
          </p>
        )}

        {!isPipelineLoading && !isBootstrapping && !error && !pipelineData?.pipeline && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Pipeline not found</p>
        )}

        {!error && pipelineData?.pipeline && (
          <>
            <div className="flex flex-col md:flex-row sm:items-center sm:justify-between gap-4 mb-6 p-3 sticky top-16 z-99 bg-white dark:border-gray-800 rounded-xl dark:bg-gray-900">
              <div className="flex justify-between flex-nowrap">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  {pipelineData.pipeline.name}
                  <p className="text-xs">({localContacts.length}/{totalForSelected} Contacts)</p>
                </h3>
              </div>

              <div className="flex gap-3 items-center">
                <select
                  value={selectedStage}
                  onChange={handleStageSelectChange}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                >
                  <option value="all">All Stages</option>
                  {[...localStages]
                    .sort((a, b) => a.order - b.order)
                    .map((stage) => (
                      <option key={stage._id} value={stage._id}>
                        {stage.name}
                      </option>
                    ))}
                </select>

                <Button size="sm" variant="outline" endIcon={<FilterIcons />} onClick={openFilter}>
                  <div className="flex justify-center items-center gap-1">
                    {hasActiveFilters && <span id="indicator" className="w-3 h-3 bg-emerald-500 rounded-full"></span>}
                    <div>Filter</div>
                  </div>
                </Button>
              </div>
            </div>

            {(isPipelineLoading || isStagesLoading || isBootstrapping) && (
              <div className="flex justify-center -mt-3 mb-4">
                <ShortSpinnerPrimary />
              </div>
            )}

            <div className="space-y-4 px-3 pb-5">
              {!isBootstrapping && localContacts.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">No contacts available</p>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext
                    items={localContacts.map((contact) => `contact-${contact._id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {localContacts.map((contact) => (
                      <MobileContactCard
                        key={contact._id}
                        contact={contact}
                        selectedStageFromParent={selectedStage}
                        stages={localStages}
                        pipelineId={pipelineId}
                        onStageChange={handleStageChange}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}

              {!isPipelineLoading && !isBootstrapping && canLoadMore && (
                <>
                  <div ref={loadMoreRef} className="h-6" aria-hidden />
                  <div className="flex justify-center pt-1 text-xs text-gray-500 dark:text-gray-400">
                    {isLoadingMore ? "Loading more..." : "Scroll to load more"}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <PipelineOffCanvas isOpen={isFilterOpen} onClose={closeFilter} />
    </div>
  );
}
