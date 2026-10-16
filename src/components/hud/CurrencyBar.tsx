"use client";

/** Top-right counters + the settings gear. */
import { faNum, useGame } from "@/store/game";

function Counter({
  icon,
  value,
  label,
  glow,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  glow: string;
}) {
  return (
    <div className="loco-plate flex items-center justify-end gap-2 py-1 pl-2 pr-3 text-white">
      <span className="text-[0.95rem] font-black drop-shadow-[0_1px_0_rgba(0,0,0,0.35)]">
        {label}: {faNum(value)}
      </span>
      <span className={`grid h-8 w-8 place-items-center rounded-full border-2 border-white/80 text-[1.05rem] shadow-inner ${glow}`}>{icon}</span>
    </div>
  );
}

export function CurrencyBar() {
  const { coins, gems, setOpenPanel } = useGame();
  return (
    <div className="pointer-events-auto flex items-start gap-2">
      <div className="flex flex-col gap-1.5">
        <Counter
          icon={<span aria-hidden>🪙</span>}
          value={coins}
          label="سکه‌ها"
          glow="bg-[radial-gradient(circle_at_50%_30%,#fff2b8,#ffcb3d_60%,#e0961a)]"
        />
        <Counter
          icon={<span aria-hidden>💧</span>}
          value={gems}
          label="شبنم‌ها"
          glow="bg-[radial-gradient(circle_at_50%_30%,#e6fbff,#52c6ff_60%,#1f8fd0)]"
        />
      </div>
      <button
        type="button"
        aria-label="تنظیمات"
        onClick={() => setOpenPanel("settings")}
        className="loco-circle h-12 w-12 text-2xl"
      >
        <span aria-hidden>⚙️</span>
      </button>
    </div>
  );
}
