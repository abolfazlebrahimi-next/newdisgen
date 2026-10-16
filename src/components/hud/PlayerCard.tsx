"use client";

/** Top-left player card: avatar, name, level, XP bar and the trophy cabinet. */
import { faNum, useGame } from "@/store/game";

export function PlayerCard() {
  const { profile, xpForNext } = useGame();
  const needed = xpForNext();
  const percent = Math.min(100, (profile.xp / needed) * 100);

  return (
    <div className="pointer-events-auto flex items-stretch gap-2">
      <div className="loco-panel flex items-center gap-2 px-2.5 py-1.5">
        <div className="relative grid h-14 w-14 place-items-center rounded-full border-[3px] border-white bg-[radial-gradient(circle_at_50%_35%,#ffd9f0_0%,#f38fd0_60%,#c95aa8_100%)] text-3xl shadow-[0_0_0_3px_#8a3f6b,inset_0_-4px_0_rgba(120,20,80,0.25)]">
          <span aria-hidden>{profile.avatar}</span>
          <span className="loco-badge -bottom-1 left-1/2 h-6 w-6 -translate-x-1/2 text-[11px]">{faNum(profile.level)}</span>
        </div>
        <div className="min-w-[9.5rem] leading-tight">
          <p className="text-[1.05rem] font-black text-amber-950">{profile.name}</p>
          <p className="text-[0.8rem] font-bold text-amber-800">
            لول {faNum(profile.level)} · {faNum(profile.xp)}/{faNum(needed)}
          </p>
          <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-amber-900/25 shadow-inner">
            <div
              className="h-full rounded-full bg-[linear-gradient(180deg,#ffe27a,#f5a623)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      <button type="button" onClick={() => useGame.getState().setOpenPanel("quests")} className="loco-panel loco-circle--none flex items-center gap-2 px-3 py-1.5 transition hover:brightness-105">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[radial-gradient(circle_at_50%_30%,#fff3c4,#ffcb3d_55%,#e09a1c)] text-2xl shadow-[0_0_0_3px_#8a4a12,inset_0_-4px_0_rgba(120,70,0,0.25)]">
          🏆
        </span>
        <span className="text-[0.95rem] font-black whitespace-nowrap text-amber-950">لیگ طلایی</span>
      </button>
    </div>
  );
}
