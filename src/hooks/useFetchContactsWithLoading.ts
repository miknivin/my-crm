import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { fetchContactsByStage, GetContactsResponse } from "@/helpers/fetchContactsByStage";

interface ContactQueryState {
  data?: GetContactsResponse;
  isLoading: boolean;
  error?: unknown;
}

interface FetchContactsResult {
  contactQueries: { [stageId: string]: ContactQueryState };
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export const useFetchContactsWithLoading = (
  pipelineId: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  localStages: Array<{ _id: string; [key: string]: any }>
): FetchContactsResult => {
  const searchParams = useSearchParams();
  const [contactQueries, setContactQueries] = useState<{ [stageId: string]: ContactQueryState }>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchContacts = useCallback(async (setLoading: boolean = true) => {
    if (!pipelineId || !localStages.length) {
      setContactQueries({});
      setIsLoading(false);
      return;
    }

    const queries: { [stageId: string]: ContactQueryState } = {};

    if (setLoading) {
      setIsLoading(true);
      localStages.forEach((stage) => {
        if (stage._id) {
          queries[stage._id] = { isLoading: true };
        }
      });
      setContactQueries(queries);
    } else {
      // Preserve existing queries during refetch
      setContactQueries((prev) => ({ ...prev }));
    }

    try {
      await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        localStages.map(async (stage: any) => {
          if (!stage._id) return;
          try {
            const filters = {
              keyword: searchParams.get("keyword") || undefined,
              source: searchParams.get("source") || undefined,
              assignedTo: searchParams.get("assignedTo") || undefined,
              startDate: searchParams.get("startDate") || undefined, // Added
              endDate: searchParams.get("endDate") || undefined,
            };
            const data = await fetchContactsByStage({
              pipelineId,
              stageId: stage._id,
              ...filters,
            });
            setContactQueries((prev) => ({
              ...prev,
              [stage._id]: { data, isLoading: false },
            }));
          } catch (error) {
            setContactQueries((prev) => ({
              ...prev,
              [stage._id]: { error, isLoading: false },
            }));
          }
        })
      );
    } finally {
      if (setLoading) {
        setIsLoading(false);
      }
    }
  }, [localStages, pipelineId, searchParams]);

  // Initial fetch with loading state
  useEffect(() => {
    fetchContacts(true);
  }, [fetchContacts]);

  // Expose refetch function that skips loading state
  const refetch = useCallback(async () => {
    await fetchContacts(false);
  }, [fetchContacts]);

  return { contactQueries, isLoading, refetch };
};