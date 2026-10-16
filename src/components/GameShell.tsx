"use client";

/**
 * The game screen: WebGL town behind, cartoon HUD in front.
 * The scene is loaded client-side only (three.js needs the DOM).
 */
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { PlayerCard } from "./hud/PlayerCard";
import { CurrencyBar } from "./hud/CurrencyBar";
import { ActionDock } from "./hud/ActionDock";
import { GiftOffer } from "./hud/GiftOffer";
import { SceneCard } from "./hud/SceneCard";
import { Panels } from "./hud/panels";
import { Toasts } from "./hud/Toasts";
import { useGame, type SceneId } from "@/store/game";

const TownScene = dynamic(() => import("./scene/TownScene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-sky-300 to-emerald-200">
      <p className="rounded-full bg-white/70 px-5 py-2 text-sm font-black text-sky-900">در حال آماده‌سازی شهر…</p>
    </div>
  ),
});

export default function GameShell() {
  const { activeScene, setActiveScene, xpForNext } = useGame();
  const [ready, setReady] = useState(false);
  // Persisted state (localStorage) and clock values must only render on the
  // client, otherwise the server HTML and the first client render disagree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-gradient-to-b from-sky-300 via-sky-200 to-emerald-200">
      <TownScene
        onReady={() => setReady(true)}
        onLandmarkClick={(id) => {
          setActiveScene(id as SceneId);
          const { pushToast } = useGame.getState();
          pushToast({ text: `وارد ${landmarkTitle(id)} شدی`, icon: "📍" });
        }}
      />

      {/* vignette so the HUD reads on top of the bright map */}
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_140px_rgba(12,40,60,0.35)]" />

      {mounted && (
        <>
          <header className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-2">
            <PlayerCard />
            <CurrencyBar />
          </header>

          <ActionDock />
          <GiftOffer />
          {activeScene && <SceneCard scene={activeScene} />}
          <Panels />
          <Toasts />

          <p className="pointer-events-none absolute bottom-3 right-1/2 z-10 hidden translate-x-1/2 rounded-full bg-slate-900/35 px-4 py-1 text-[11px] font-bold text-white sm:block">
            امتیاز تا لول بعدی: {xpForNext()}
          </p>
        </>
      )}

      {/* the game title, drawn like the logo plate in the reference art */}
      <div className="pointer-events-none absolute left-1/2 top-3 z-10 hidden -translate-x-1/2 sm:top-4 sm:block">
        <h1
          className="select-none text-[3.1rem] font-black leading-none tracking-tight text-[#ffe9a8] sm:text-[3.9rem]"
          style={{
            WebkitTextStroke: "3px #7a3b00",
            paintOrder: "stroke fill",
            textShadow: "0 8px 0 rgba(150,80,10,0.85), 0 12px 18px rgba(60,30,0,0.35)",
          }}
        >
          LOCO
        </h1>
      </div>

      {!ready && (
        <p className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-slate-900/50 px-4 py-1 text-xs font-bold text-white">
          در حال بارگذاری مدل‌های سه‌بعدی Kenney…
        </p>
      )}

    </main>
  );
}

function landmarkTitle(id: string) {
  const titles: Record<string, string> = {
    hospital: "بیمارستان لینا",
    police: "کلانتری",
    garage: "مکانیکی",
    gym: "باشگاه",
    shops: "فروشگاه‌ها",
    farm: "مزرعه",
    barn: "انبار",
    park: "شهربازی",
    plaza: "میدان شهر",
    playground: "زمین بازی",
    market: "بازار روز",
  };
  return titles[id] ?? "این مکان";
}
