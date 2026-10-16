"use client";

/** Floating feedback messages (rewards, hints, purchases). */
import { useGame } from "@/store/game";

export function Toasts() {
  const { toasts, dismissToast } = useGame();
  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-40 flex w-[22rem] max-w-[90vw] -translate-x-1/2 flex-col items-stretch gap-2">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismissToast(toast.id)}
          className="toast-in pointer-events-auto flex items-center gap-2 rounded-2xl border-2 border-white/80 bg-[linear-gradient(180deg,#fffdf3,#f6e2b4)] px-3 py-2 text-right shadow-[0_0_0_3px_#a9682c,0_8px_14px_rgba(60,30,0,0.35)]"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-200 text-lg shadow-inner">{toast.icon ?? "✨"}</span>
          <span className="flex-1 text-sm font-black text-amber-950">{toast.text}</span>
        </button>
      ))}
    </div>
  );
}
