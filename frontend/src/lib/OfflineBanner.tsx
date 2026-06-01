import { useSync } from './SyncProvider';
import { WifiOff, CloudUpload, Loader2 } from 'lucide-react';

export default function OfflineBanner() {
  const { phase, pendingCount, isOffline } = useSync();

  if (phase === 'syncing') {
    return (
      <div className="sync-banner sync-banner--syncing">
        <Loader2 className="w-4 h-4 animate-spin" />
        Syncing your changes…
      </div>
    );
  }

  if (isOffline) {
    return (
      <div className="sync-banner sync-banner--offline">
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>
          Offline mode — you can still log expenses
          {pendingCount > 0 ? ` (${pendingCount} waiting to sync)` : ''}
        </span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="sync-banner sync-banner--pending">
        <CloudUpload className="w-4 h-4 shrink-0" />
        {pendingCount} change{pendingCount > 1 ? 's' : ''} waiting to sync…
      </div>
    );
  }

  return null;
}
