"use client";

/**
 * Game state: wallet, level/xp, quests, settings and the little interaction
 * feedback the HUD needs. Persisted to localStorage so the town keeps its
 * progress between refreshes.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type QuestState = "available" | "active" | "ready" | "done";

export type Quest = {
  id: string;
  title: string;
  place: string;
  reward: { coins: number; gems: number; xp: number };
  /** seconds the job takes once accepted */
  duration: number;
  state: QuestState;
  acceptedAt?: number;
};

export type Profile = {
  name: string;
  level: number;
  xp: number;
  avatar: string;
};

export type Toast = {
  id: number;
  text: string;
  icon?: string;
  tone?: "good" | "info" | "bad";
};

export type SceneId = "hospital" | "police" | "garage" | "gym" | "shops" | "farm" | "barn" | "park" | "plaza" | "playground" | "market";

export type GameState = {
  profile: Profile;
  coins: number;
  gems: number;
  started: boolean;
  sound: boolean;
  music: boolean;
  quests: Quest[];
  toasts: Toast[];
  activeScene: SceneId | null;
  openPanel: "none" | "backpack" | "messages" | "quests" | "shop" | "settings" | "profile";
  xpForNext: () => number;
  acceptGift: () => void;
  setOpenPanel: (panel: GameState["openPanel"]) => void;
  setActiveScene: (scene: SceneId | null) => void;
  startQuest: (id: string) => void;
  finishQuest: (id: string) => void;
  addReward: (reward: { coins?: number; gems?: number; xp?: number }) => void;
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  reset: () => void;
};

const initialQuests: Quest[] = [
  {
    id: "hospital-delivery",
    title: "تحویل دارو به بیمارستان",
    place: "بیمارستان لینا",
    reward: { coins: 420, gems: 12, xp: 60 },
    duration: 90,
    state: "active",
  },
  {
    id: "farm-harvest",
    title: "برداشت محصول مزرعه",
    place: "مزرعه",
    reward: { coins: 380, gems: 8, xp: 55 },
    duration: 120,
    state: "available",
  },
  {
    id: "garage-repair",
    title: "تعمیر ماشین در مکانیکی",
    place: "مکانیکی",
    reward: { coins: 320, gems: 6, xp: 45 },
    duration: 75,
    state: "available",
  },
  {
    id: "police-patrol",
    title: "گشت شبانه کلانتری",
    place: "کلانتری",
    reward: { coins: 500, gems: 15, xp: 80 },
    duration: 180,
    state: "available",
  },
];

const initialState = {
  profile: { name: "سارا جان", level: 12, xp: 340, avatar: "👧" },
  coins: 5000,
  gems: 1250,
  started: false,
  sound: true,
  music: true,
  quests: initialQuests,
  toasts: [] as Toast[],
  activeScene: null,
  openPanel: "none",
} as const;

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      profile: { ...initialState.profile },
      coins: initialState.coins,
      gems: initialState.gems,
      started: false,
      sound: true,
      music: true,
      quests: initialQuests.map((q) => ({ ...q })),
      toasts: [],
      activeScene: null,
      openPanel: "none",

      xpForNext: () => 120 + (get().profile.level - 1) * 60,

      acceptGift: () => {
        set((state) => ({
          started: true,
          coins: state.coins + 5000,
          gems: state.gems + 1250,
        }));
        get().pushToast({ text: "۵٬۰۰۰ سکه و ۱٬۲۵۰ شبنم اضافه شد!", icon: "🎁", tone: "good" });
      },

      setOpenPanel: (panel) => set({ openPanel: panel }),
      setActiveScene: (scene) => set({ activeScene: scene }),

      startQuest: (id) => {
        set((state) => ({
          quests: state.quests.map((q) => (q.id === id && q.state === "available" ? { ...q, state: "active", acceptedAt: Date.now() } : q)),
        }));
        const quest = get().quests.find((q) => q.id === id);
        if (quest) get().pushToast({ text: `کار «${quest.title}» شروع شد`, icon: "📋" });
      },

      finishQuest: (id) => {
        const quest = get().quests.find((q) => q.id === id);
        if (!quest || quest.state !== "active") return;
        set((state) => ({
          quests: state.quests.map((q) => (q.id === id ? { ...q, state: "done" } : q)),
        }));
        get().addReward(quest.reward);
        get().pushToast({ text: `پاداش «${quest.title}» دریافت شد`, icon: "🏆", tone: "good" });
      },

      addReward: ({ coins = 0, gems = 0, xp = 0 }) => {
        set((state) => {
          const nextXp = state.profile.xp + xp;
          const needed = 120 + (state.profile.level - 1) * 60;
          const levelUp = nextXp >= needed;
          return {
            coins: state.coins + coins,
            gems: state.gems + gems,
            profile: {
              ...state.profile,
              level: levelUp ? state.profile.level + 1 : state.profile.level,
              xp: levelUp ? nextXp - needed : nextXp,
            },
          };
        });
        if (coins || gems) {
          get().pushToast({ text: `${coins ? `${coins} سکه` : ""}${coins && gems ? " و " : ""}${gems ? `${gems} شبنم` : ""} گرفتی`, icon: "🪙", tone: "good" });
        }
      },

      pushToast: (toast) => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        set((state) => ({ toasts: [...state.toasts, { id, ...toast }] }));
        setTimeout(() => {
          set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
        }, 3200);
      },

      dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
      toggleSound: () => set((state) => ({ sound: !state.sound })),
      toggleMusic: () => set((state) => ({ music: !state.music })),
      reset: () =>
        set({
          profile: { ...initialState.profile },
          coins: 0,
          gems: 0,
          started: false,
          quests: initialQuests.map((q) => ({ ...q })),
        }),
    }),
    {
      name: "loco-town",
      partialize: (state) => ({
        profile: state.profile,
        coins: state.coins,
        gems: state.gems,
        started: state.started,
        quests: state.quests,
        sound: state.sound,
        music: state.music,
      }),
    },
  ),
);

/** Persian digits with thousands separators, e.g. 12500 → ۱۲٬۵۰۰ */
export function faNum(value: number) {
  return new Intl.NumberFormat("fa-IR", { useGrouping: true }).format(Math.round(value));
}
