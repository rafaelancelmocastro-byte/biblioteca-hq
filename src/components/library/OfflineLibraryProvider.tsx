import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getOfflineIds } from "../../services/offlineLibrary";

const OfflineIdsContext = createContext<Set<string>>(new Set());

export const OfflineLibraryProvider: React.FC<{ userId: string; children: React.ReactNode }> = ({ userId, children }) => {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!userId) {
        if (active) setIds(new Set());
        return;
      }
      try {
        const next = await getOfflineIds(userId);
        if (active) setIds(new Set(next));
      } catch {
        if (active) setIds(new Set());
      }
    };
    void refresh();
    window.addEventListener("biblioteca-offline-changed", refresh);
    return () => {
      active = false;
      window.removeEventListener("biblioteca-offline-changed", refresh);
    };
  }, [userId]);

  const value = useMemo(() => ids, [ids]);
  return <OfflineIdsContext.Provider value={value}>{children}</OfflineIdsContext.Provider>;
};

export const useOfflineIds = () => useContext(OfflineIdsContext);
