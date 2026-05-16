import { get, set } from "idb-keyval";
import { Dispatch, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DragSyncEvent, DragSyncUpdate } from "../types";
import { BoardAction } from "./events";

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY = 500;
const DEBOUNCE_MS = 300;

interface UseDragSyncWorkerArgs {
  pipelineId: string;
  queue: DragSyncEvent[];
  dispatch: Dispatch<BoardAction>;
  executeBatchUpdate: (updates: DragSyncUpdate[]) => Promise<unknown>;
  executeBatchUpdateKeepAlive?: (updates: DragSyncUpdate[]) => Promise<unknown>;
}

const buildQueueKey = (pipelineId: string) => `pipeline-drag-sync-queue-${pipelineId}`;

const coalesceUpdates = (events: DragSyncEvent[]) => {
  const byContact = new Map<string, DragSyncUpdate>();
  for (const event of events) {
    byContact.set(event.update.contactId, event.update);
  }
  return Array.from(byContact.values());
};

export function useDragSyncWorker({
  pipelineId,
  queue,
  dispatch,
  executeBatchUpdate,
  executeBatchUpdateKeepAlive,
}: UseDragSyncWorkerArgs) {
  const queueRef = useRef(queue);
  const inFlightRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rehydratedHadItemsRef = useRef(false);
  const hasSeenNonEmptyQueueRef = useRef(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const queueKey = useMemo(() => buildQueueKey(pipelineId), [pipelineId]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    rehydratedHadItemsRef.current = false;
    hasSeenNonEmptyQueueRef.current = false;
    setIsHydrated(false);

    let isMounted = true;

    const hydrateQueue = async () => {
      try {
        const savedQueue = (await get<DragSyncEvent[]>(queueKey)) ?? [];
        if (!isMounted || savedQueue.length === 0) return;

        rehydratedHadItemsRef.current = true;
        dispatch({ type: "SYNC_REHYDRATED_FROM_STORAGE", payload: { events: savedQueue } });
      } catch (err) {
        console.error("Failed to hydrate drag sync queue", err);
      } finally {
        if (isMounted) setIsHydrated(true);
      }
    };

    hydrateQueue().catch((err) => {
      console.error("Failed to run drag sync hydration", err);
    });

    return () => {
      isMounted = false;
    };
  }, [dispatch, queueKey]);

  useEffect(() => {
    if (!isHydrated) return;

    if (queue.length > 0) {
      hasSeenNonEmptyQueueRef.current = true;
    }

    if (
      queue.length === 0 &&
      rehydratedHadItemsRef.current &&
      !hasSeenNonEmptyQueueRef.current
    ) {
      return;
    }

    set(queueKey, queue).catch((err) => {
      console.error("Failed to persist drag sync queue", err);
    });
  }, [isHydrated, queue, queueKey]);

  const flushQueue = useCallback(
    async (attempt: number) => {
      const currentQueue = queueRef.current;
      if (currentQueue.length === 0 || inFlightRef.current) {
        dispatch({ type: "SYNC_STATUS", payload: { status: "idle" } });
        return;
      }

      const opIds = currentQueue.map((event) => event.opId);
      const updates = coalesceUpdates(currentQueue);

      inFlightRef.current = true;
      dispatch({ type: "SYNC_STATUS", payload: { status: "syncing" } });

      try {
        await executeBatchUpdate(updates);
        dispatch({ type: "SYNC_ACKED", payload: { opIds } });
        dispatch({ type: "SYNC_STATUS", payload: { status: "idle" } });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sync failed";

        if (attempt < MAX_RETRIES - 1) {
          dispatch({
            type: "SYNC_FAILED",
            payload: { opIds, error: message, final: false },
          });

          const delay = BASE_RETRY_DELAY * Math.pow(2, attempt);
          retryTimerRef.current = setTimeout(() => {
            flushQueue(attempt + 1).catch((err) => {
              console.error("Retry flush failed", err);
            });
          }, delay);
        } else {
          dispatch({
            type: "SYNC_FAILED",
            payload: { opIds, error: message, final: true },
          });
          dispatch({ type: "SYNC_STATUS", payload: { status: "error", error: message } });
        }
      } finally {
        inFlightRef.current = false;
      }
    },
    [dispatch, executeBatchUpdate]
  );

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (queue.length === 0) return;

    debounceTimerRef.current = setTimeout(() => {
      flushQueue(0).catch((err) => {
        console.error("Debounced drag sync flush failed", err);
      });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [flushQueue, queue.length]);

  useEffect(() => {
    const tryKeepAliveFlush = () => {
      if (!executeBatchUpdateKeepAlive) return;

      const currentQueue = queueRef.current;
      if (currentQueue.length === 0) return;

      const updates = coalesceUpdates(currentQueue);
      executeBatchUpdateKeepAlive(updates).catch((err) => {
        console.error("Keepalive drag sync flush failed", err);
      });
    };

    const handleOnline = () => {
      flushQueue(0).catch((err) => {
        console.error("Online drag sync flush failed", err);
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      tryKeepAliveFlush();
    };

    const handlePageHide = () => {
      tryKeepAliveFlush();
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [executeBatchUpdateKeepAlive, flushQueue]);
}
