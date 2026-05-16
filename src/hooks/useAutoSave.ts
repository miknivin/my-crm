import { useEffect } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useAutoSave = (pendingUpdates:any, isBatchUpdating:any, saveToBackend:any, interval = 5000) => {
  useEffect(() => {
    const timer = setInterval(async () => {
      if (pendingUpdates.length > 0 && !isBatchUpdating) {
        await saveToBackend();
      }
    }, interval);

    return () => clearInterval(timer);
  }, [pendingUpdates, isBatchUpdating, saveToBackend, interval]);
};

export default useAutoSave;