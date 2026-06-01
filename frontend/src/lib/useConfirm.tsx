import { useState } from 'react';

export function useConfirm() {
  const [state, setState] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null);

  const confirm = (message: string) =>
    new Promise<boolean>((resolve) => setState({ message, resolve }));

  const handle = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  const dialog = state ? (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
      <div className="glass-card p-5 w-full max-w-sm shadow-2xl">
        <p className="text-white font-semibold text-[14px] leading-relaxed mb-5">{state.message}</p>
        <div className="flex gap-2">
          <button
            onClick={() => handle(false)}
            className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-[13px]"
          >
            Cancel
          </button>
          <button
            onClick={() => handle(true)}
            className="flex-1 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-[13px]"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
