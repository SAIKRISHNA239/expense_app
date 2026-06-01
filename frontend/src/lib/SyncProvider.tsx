import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { localDb } from './localDb';
import { subscribeNetwork, isOnline } from './network';
import { syncPendingMutations, hydrateQueryCache, cacheFromServer } from './offlineSync';

type SyncPhase = 'online' | 'offline' | 'syncing';

interface SyncContextValue {
  phase: SyncPhase;
  pendingCount: number;
  isOffline: boolean;
  refreshPendingCount: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<SyncPhase>(isOnline() ? 'online' : 'offline');
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    setPendingCount(await localDb.getQueueLength());
  }, []);

  const runSync = useCallback(async () => {
    if (!isOnline()) return;
    const pending = await localDb.getQueueLength();
    if (pending === 0) {
      await cacheFromServer();
      await hydrateQueryCache(queryClient);
      return;
    }
    setPhase('syncing');
    await syncPendingMutations(queryClient);
    await refreshPendingCount();
    setPhase('online');
  }, [queryClient, refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();
    const onQueueChange = () => refreshPendingCount();
    window.addEventListener('offline:queue-changed', onQueueChange);
    const unsub = subscribeNetwork(async (online) => {
      if (online) {
        await runSync();
      } else {
        setPhase('offline');
      }
    });
    if (isOnline()) runSync();
    return () => {
      unsub();
      window.removeEventListener('offline:queue-changed', onQueueChange);
    };
  }, [runSync, refreshPendingCount]);

  return (
    <SyncContext.Provider
      value={{
        phase,
        pendingCount,
        isOffline: phase === 'offline',
        refreshPendingCount,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}
