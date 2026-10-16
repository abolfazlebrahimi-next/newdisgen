"use client";

/** The starter pack card from the reference art ("Accept" / پذیرفتن). */
import { faNum, useGame } from "@/store/game";

export function GiftOffer() {
  const { started, acceptGift, pushToast } = useGame();
  if (started) return null;

  return (
    <div className="pointer-events-auto pop-in absolute bottom-28 left-1/2 w-[21rem] -translate-x-1/2 sm:left-5 sm:translate-x-0">
      <div className="loco-panel px-5 py-4">
        <ul className="space-y-2 text-[1.05rem] font-black text-amber-950">
          <li className="flex items-center justify-between">
            <span>سکه‌ها:</span>
            <span className="flex items-center gap-2">
              <span className="text-amber-800">{faNum(5000)}</span>
              <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-[radial-gradient(circle_at_50%_30%,#fff2b8,#ffcb3d_60%,#e0961a)] text-sm">🪙</span>
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span>شبنم‌ها:</span>
            <span className="flex items-center gap-2">
              <span className="text-sky-800">{faNum(1250)}</span>
              <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-[radial-gradient(circle_at_50%_30%,#e6fbff,#52c6ff_60%,#1f8fd0)] text-sm">💧</span>
            </span>
          </li>
        </ul>
        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={acceptGift} className="loco-btn flex-1 px-4 py-2 text-lg">
            پذیرفتن
          </button>
          <button
            type="button"
            onClick={() => pushToast({ text: "هدیه در کوله‌پشتی می‌ماند", icon: "🎒" })}
            className="loco-btn loco-btn-wood px-4 py-2 text-sm"
          >
            بعداً
          </button>
        </div>
      </div>
    </div>
  );
}
