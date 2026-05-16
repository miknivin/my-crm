import { useCallback } from "react";

import { useBatchUpdateContactDragMutation } from "@/app/redux/api/contactApi";
import { DragSyncUpdate } from "@/components/pipeline/types";

export function usePipelineDragSyncApi() {
  const [batchUpdateContactDrag] = useBatchUpdateContactDragMutation();

  const executeBatchUpdate = useCallback(
    async (updates: DragSyncUpdate[]) => {
      await batchUpdateContactDrag({ updates }).unwrap();
    },
    [batchUpdateContactDrag]
  );

  const executeBatchUpdateKeepAlive = useCallback(async (updates: DragSyncUpdate[]) => {
    if (updates.length === 0) return;

    await fetch("/api/contacts/update-drag/batch", {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ updates }),
      keepalive: true,
    });
  }, []);

  return {
    executeBatchUpdate,
    executeBatchUpdateKeepAlive,
  };
}
