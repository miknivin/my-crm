/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { fetchContactsByStage } from "@/helpers/fetchContactsByStage";

// You can extract this interface if you want to reuse it
interface StageContactState {
  contacts: any[];           // ← replace with your actual Contact type
  page: number;
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error?: unknown;
}

export const useFetchContacts = (
  pipelineId: string ,
  localStages: Array<{ _id: string; [key: string]: any }>
) => {
  const searchParams = useSearchParams();
  const [contactQueries, setContactQueries] = useState<Record<string, StageContactState>>({});

  // -------------------------------------------------------------------------
  // Initial fetch + reset when pipeline / stages / filters change
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!pipelineId || localStages.length === 0) {
      setContactQueries({});
      return;
    }

    // 1. Initialize loading state for every stage
    const initialState: Record<string, StageContactState> = {};
    localStages.forEach((stage) => {
      if (stage._id) {
        initialState[stage._id] = {
          contacts: [],
          page: 1,
          total: 0,
          hasMore: true,
          isLoading: true,
          isLoadingMore: false,
        };
      }
    });
    setContactQueries(initialState);

    // 2. Extract shared filter values (same for all stages)
    const keyword = searchParams.get("keyword") || undefined;
    const source = searchParams.get("source") || undefined;
    const assignedTo = searchParams.get("assignedTo") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    let activities: { value: string; isNot: boolean }[] | undefined = undefined;
    const activitiesParam = searchParams.get("activities");
    if (activitiesParam) {
      try {
        const parsed = JSON.parse(activitiesParam);
        if (Array.isArray(parsed)) {
          activities = parsed;
        }
      } catch (e) {
        console.error("Invalid activities param:", e);
      }
    }

    // 3. Fetch first page for each stage — in parallel
    const fetchInitialPages = async () => {
      await Promise.all(
        localStages.map(async (stage) => {
          if (!stage._id) return;

          try {
            const data = await fetchContactsByStage({
              pipelineId,
              stageId: stage._id,
              keyword,
              source,
              assignedTo,
              startDate,
              endDate,
              activities,
              page: 1,
              limit: 10,           // ← fixed page size
            });

            setContactQueries((prev) => ({
              ...prev,
              [stage._id]: {
                contacts: data.contacts,
                total: data.total,
                page: 1,
                hasMore: data.contacts.length < data.total,
                isLoading: false,
                isLoadingMore: false,
                error: undefined,
              },
            }));
          } catch (error) {
            setContactQueries((prev) => ({
              ...prev,
              [stage._id]: {
                ...prev[stage._id],
                error,
                isLoading: false,
                hasMore: false,
              },
            }));
          }
        })
      );
    };

    fetchInitialPages();
  }, [localStages, pipelineId, searchParams]);

  // -------------------------------------------------------------------------
  // Load more function – call this when user scrolls near bottom of a stage
  // -------------------------------------------------------------------------
  const loadMore = useCallback(
    async (stageId: string) => {
      setContactQueries((prev) => {
        const state = prev[stageId];
        if (!state || !state.hasMore || state.isLoadingMore) return prev;
        return {
          ...prev,
          [stageId]: { ...state, isLoadingMore: true },
        };
      });

      try {
        const currentState = contactQueries[stageId];
        if (!currentState) return;

        // Reuse the same filters (you can also extract this to a helper function)
        const keyword = searchParams.get("keyword") || undefined;
        const source = searchParams.get("source") || undefined;
        const assignedTo = searchParams.get("assignedTo") || undefined;
        const startDate = searchParams.get("startDate") || undefined;
        const endDate = searchParams.get("endDate") || undefined;

        let activities: { value: string; isNot: boolean }[] | undefined = undefined;
        const activitiesParam = searchParams.get("activities");
        if (activitiesParam) {
          try {
            const parsed = JSON.parse(activitiesParam);
            if (Array.isArray(parsed)) activities = parsed;
          } catch {}
        }

        const nextPage = currentState.page + 1;

        const data = await fetchContactsByStage({
          pipelineId,
          stageId,
          keyword,
          source,
          assignedTo,
          startDate,
          endDate,
          activities,
          page: nextPage,
          limit: 10,
        });

        setContactQueries((prev) => {
          const state = prev[stageId];
          if (!state) return prev;

          const newContacts = [...state.contacts, ...data.contacts];

          return {
            ...prev,
            [stageId]: {
              ...state,
              contacts: newContacts,
              page: data.page,
              total: data.total,
              hasMore: newContacts.length < data.total,
              isLoadingMore: false,
            },
          };
        });
      } catch (error) {
        console.error(`Error loading more for stage ${stageId}:`, error);
        setContactQueries((prev) => ({
          ...prev,
          [stageId]: {
            ...prev[stageId],
            isLoadingMore: false,
          },
        }));
      }
    },
    [contactQueries, pipelineId, searchParams]
  );

  return {
    contactQueries,
    loadMore,
  };
};