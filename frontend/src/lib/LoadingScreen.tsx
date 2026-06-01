export function LoadingScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
      </div>
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Loading</p>
    </div>
  );
}

export function ErrorScreen({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 content-pad text-center">
      <p className="text-rose-400 font-semibold text-sm">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-5 py-2.5 rounded-xl glass-card text-sm font-bold text-white active:scale-95 transition-transform"
        >
          Retry
        </button>
      )}
    </div>
  );
}
