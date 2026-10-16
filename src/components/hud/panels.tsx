"use client";

/** Modal panels behind the dock buttons. */
import { faNum, useGame } from "@/store/game";
import { SCENES } from "./SceneCard";

function PanelShell({
  title,
  icon,
  children,
  onClose,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-slate-900/35 p-4 backdrop-blur-[2px]">
      <div className="pop-in loco-panel w-full max-w-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-black text-amber-950">
            <span className="text-2xl">{icon}</span>
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="بستن" className="loco-circle h-10 w-10 text-lg">
            ✖
          </button>
        </div>
        <div className="loco-scroll max-h-[60vh] overflow-y-auto pl-1">{children}</div>
      </div>
    </div>
  );
}

export function Panels() {
  const { openPanel, setOpenPanel, quests, startQuest, finishQuest, coins, gems, reset, sound, music, toggleSound, toggleMusic } = useGame();
  const close = () => setOpenPanel("none");
  if (openPanel === "none") return null;

  if (openPanel === "quests") {
    return (
      <PanelShell title="کارها و جایزه‌ها" icon="📜" onClose={close}>
        <ul className="space-y-2">
          {quests.map((quest) => {
            const ready = quest.state === "active" && quest.acceptedAt && Date.now() - quest.acceptedAt > quest.duration * 1000;
            return (
              <li key={quest.id} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-amber-900/20 bg-white/70 px-3 py-2">
                <div className="leading-tight">
                  <p className="font-black text-amber-950">{quest.title}</p>
                  <p className="text-xs font-bold text-amber-700">{quest.place}</p>
                  <p className="text-xs font-bold text-emerald-800">
                    🪙 {faNum(quest.reward.coins)} · 💧 {faNum(quest.reward.gems)} · ⭐ {faNum(quest.reward.xp)}
                  </p>
                </div>
                {quest.state === "done" ? (
                  <span className="loco-gold px-3 py-1 text-sm font-black">تمام شد</span>
                ) : quest.state === "active" ? (
                  <button type="button" className="loco-btn px-3 py-1.5 text-sm" onClick={() => finishQuest(quest.id)}>
                    {ready ? "دریافت جایزه" : "تحویل کار"}
                  </button>
                ) : (
                  <button type="button" className="loco-btn loco-btn-wood px-3 py-1.5 text-sm" onClick={() => startQuest(quest.id)}>
                    شروع
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </PanelShell>
    );
  }

  if (openPanel === "backpack") {
    const items: [string, string, number][] = [
      ["🪙", "کیسهٔ سکه", coins],
      ["💧", "شبنم آبی", gems],
      ["🔧", "جعبه‌ابزار مکانیکی", 2],
      ["🍎", "سبد میوه", 6],
      ["🎈", "بادکنک رنگی", 3],
      ["📕", "کتاب کارهای شهر", 1],
    ];
    return (
      <PanelShell title="کوله‌پشتی" icon="🎒" onClose={close}>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map(([icon, name, count]) => (
            <li key={name} className="flex items-center gap-2 rounded-2xl border-2 border-amber-900/20 bg-white/70 px-3 py-2">
              <span className="text-2xl">{icon}</span>
              <span className="leading-tight">
                <span className="block text-sm font-black text-amber-950">{name}</span>
                <span className="text-xs font-bold text-amber-700">{faNum(count)} عدد</span>
              </span>
            </li>
          ))}
        </ul>
      </PanelShell>
    );
  }

  if (openPanel === "messages") {
    const messages: [string, string, string][] = [
      ["👧", "سارا جان", "سلام! امروز شهربازی شلوغه، حواست به بچه‌ها باشه."],
      ["👷", "کارگر ساختمانی", "آجرها رسید، اسکلت خانهٔ جدید آمادهٔ کار است."],
      ["🐑", "چوپان مزرعه", "گوسفندها سلامتند، پشم‌ها رو فرستادم انبار."],
      ["🚓", "افسر کلانتری", "گشت شبانه رو شروع کردم، همه‌چیز آرامه."],
    ];
    return (
      <PanelShell title="پیام‌ها" icon="💬" onClose={close}>
        <ul className="space-y-2">
          {messages.map(([icon, from, text]) => (
            <li key={from} className="flex gap-3 rounded-2xl border-2 border-amber-900/20 bg-white/70 px-3 py-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-200 text-xl shadow-inner">{icon}</span>
              <p className="leading-tight">
                <span className="block text-sm font-black text-amber-950">{from}</span>
                <span className="text-sm font-bold text-amber-800">{text}</span>
              </p>
            </li>
          ))}
        </ul>
      </PanelShell>
    );
  }

  if (openPanel === "shop") {
    const goods: [string, string, number][] = [
      ["🍦", "بستنی ویژه", 120],
      ["🎈", "بادکنک رنگی", 80],
      ["🏀", "توپ بازی", 150],
      ["🧃", "آبمیوه", 60],
      ["🎡", "بلیت شهربازی", 300],
      ["🐑", "علوفهٔ گوسفند", 90],
    ];
    return (
      <PanelShell title="فروشگاه شهر" icon="🛒" onClose={close}>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {goods.map(([icon, name, price]) => (
            <li key={name} className="flex flex-col items-center gap-1 rounded-2xl border-2 border-amber-900/20 bg-white/70 px-3 py-3">
              <span className="text-3xl">{icon}</span>
              <span className="text-sm font-black text-amber-950">{name}</span>
              <button
                type="button"
                className="loco-btn mt-1 px-3 py-1 text-sm"
                onClick={() => useGame.getState().addReward({ coins: -price, xp: 5 })}
              >
                {faNum(price)} 🪙
              </button>
            </li>
          ))}
        </ul>
      </PanelShell>
    );
  }

  if (openPanel === "settings") {
    return (
      <PanelShell title="تنظیمات" icon="⚙️" onClose={close}>
        <div className="space-y-3">
          <label className="flex items-center justify-between rounded-2xl border-2 border-amber-900/20 bg-white/70 px-4 py-3">
            <span className="font-black text-amber-950">🔊 صدا</span>
            <input type="checkbox" checked={sound} onChange={toggleSound} className="h-6 w-6 accent-emerald-600" />
          </label>
          <label className="flex items-center justify-between rounded-2xl border-2 border-amber-900/20 bg-white/70 px-4 py-3">
            <span className="font-black text-amber-950">🎵 موسیقی</span>
            <input type="checkbox" checked={music} onChange={toggleMusic} className="h-6 w-6 accent-emerald-600" />
          </label>
          <div className="rounded-2xl border-2 border-amber-900/20 bg-white/70 px-4 py-3 text-sm font-bold text-amber-800">
            <p>🖱️ برای زوم روی شهر کلید Ctrl را نگه دار و اسکرول کن.</p>
            <p className="mt-1">👆 روی هر ساختمان بزن تا کار همان مکان را ببینی.</p>
          </div>
          <div className="rounded-2xl border-2 border-amber-900/20 bg-white/70 px-4 py-3">
            <p className="mb-2 text-sm font-black text-amber-950">مکان‌های شهر</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SCENES).map(([id, scene]) => (
                <button
                  key={id}
                  type="button"
                  className="loco-btn loco-btn-blue px-3 py-1 text-xs"
                  onClick={() => {
                    close();
                    useGame.getState().setActiveScene(id as keyof typeof SCENES);
                  }}
                >
                  {scene.icon} {scene.title}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="loco-btn loco-btn-wood w-full px-4 py-2" onClick={reset}>
            شروع دوباره از صفر
          </button>
        </div>
      </PanelShell>
    );
  }

  if (openPanel === "profile") {
    return (
      <PanelShell title="پروفایل" icon="👧" onClose={close}>
        <p className="font-bold text-amber-900">این پنل فعلاً خالی است.</p>
      </PanelShell>
    );
  }

  return null;
}
