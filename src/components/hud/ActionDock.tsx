"use client";

/** Bottom-left round buttons (backpack, messages, quests) and bottom-right dock. */
import { faNum, useGame, type GameState } from "@/store/game";

function DockButton({
  icon,
  label,
  badge,
  onClick,
  size = 68,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick: () => void;
  size?: number;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="loco-circle relative"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      <span aria-hidden>{icon}</span>
      {badge !== undefined && badge > 0 && (
        <span className="loco-badge -right-1 -top-1 h-6 min-w-6 px-1 text-[11px]">{faNum(badge)}</span>
      )}
    </button>
  );
}

export function ActionDock() {
  const { setOpenPanel, quests } = useGame();
  const openQuests = quests.filter((q) => q.state === "active" && q.acceptedAt && Date.now() - q.acceptedAt > q.duration * 1000).length;

  const open = (panel: GameState["openPanel"]) => () => setOpenPanel(panel);

  return (
    <>
      <div className="pointer-events-auto absolute bottom-5 left-5 flex items-end gap-3">
        <DockButton icon="🎒" label="کوله‌پشتی" onClick={open("backpack")} badge={2} />
        <DockButton icon="💬" label="پیام‌ها" onClick={open("messages")} badge={5} />
        <DockButton icon="📜" label="کارها" onClick={open("quests")} badge={openQuests} />
      </div>

      <div className="pointer-events-auto absolute bottom-5 right-5 flex items-end gap-3">
        <DockButton icon="🥖" label="نانوایی" onClick={() => useGame.getState().pushToast({ text: "نانوایی تا ۵ دقیقهٔ دیگر آماده می‌شود", icon: "🥖" })} size={62} />
        <DockButton icon="🛒" label="فروشگاه" onClick={open("shop")} size={62} />
      </div>
    </>
  );
}
