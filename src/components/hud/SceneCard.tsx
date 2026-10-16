"use client";

/** Panels: quests, backpack, messages, shop, settings — plus the building card. */
import { faNum, useGame, type SceneId } from "@/store/game";

export const SCENES: Record<
  SceneId,
  { icon: string; title: string; blurb: string; perk: string; reward: { coins: number; gems: number; xp: number } }
> = {
  hospital: {
    icon: "🏥",
    title: "بیمارستان لینا",
    blurb: "درمان سریع شهروندان و تحویل دارو.",
    perk: "هر درمان ۴۰ سکه و ۲ شبنم",
    reward: { coins: 420, gems: 12, xp: 60 },
  },
  police: {
    icon: "🚓",
    title: "کلانتری",
    blurb: "گشت شبانه و گرفتن دزدها.",
    perk: "هر مأموریت ۵۰ سکه",
    reward: { coins: 500, gems: 15, xp: 80 },
  },
  garage: {
    icon: "🔧",
    title: "مکانیکی",
    blurb: "تعمیر ماشین‌های شهر و تیونینگ.",
    perk: "هر تعمیر ۳۵ سکه",
    reward: { coins: 320, gems: 6, xp: 45 },
  },
  gym: {
    icon: "🏋️",
    title: "باشگاه",
    blurb: "تمرین بچه‌های شهر و مسابقهٔ وزنه‌برداری.",
    perk: "انرژی بیشتر برای کارگرها",
    reward: { coins: 260, gems: 5, xp: 40 },
  },
  shops: {
    icon: "🏪",
    title: "فروشگاه‌های شهر",
    blurb: "خرید وسایل خانه و لباس.",
    perk: "قیمت ویژهٔ امروز",
    reward: { coins: 300, gems: 10, xp: 35 },
  },
  farm: {
    icon: "🌾",
    title: "مزرعه",
    blurb: "کاشت و برداشت محصول تازه.",
    perk: "هر برداشت ۴۰ سکه",
    reward: { coins: 380, gems: 8, xp: 55 },
  },
  barn: {
    icon: "🐑",
    title: "انبار و دامداری",
    blurb: "نگهداری گوسفندها و علوفه.",
    perk: "پشم برای کارگاه",
    reward: { coins: 340, gems: 7, xp: 45 },
  },
  park: {
    icon: "🎡",
    title: "شهربازی",
    blurb: "چرخ‌فلک، رولرکوستر و سیرک.",
    perk: "بلیت نیم‌بها برای اهالی",
    reward: { coins: 450, gems: 14, xp: 70 },
  },
  plaza: {
    icon: "⛲",
    title: "میدان شهر",
    blurb: "آب‌نما و نیمکت‌های استراحت.",
    perk: "حال خوب ساکنین",
    reward: { coins: 240, gems: 6, xp: 30 },
  },
  playground: {
    icon: "🛝",
    title: "زمین بازی کودکان",
    blurb: "سرسره و تاب و سندباکس.",
    perk: "کودکان خوشحال‌تر",
    reward: { coins: 220, gems: 5, xp: 28 },
  },
  market: {
    icon: "🥕",
    title: "بازار روز",
    blurb: "دکه‌های میوه و سبزی تازه.",
    perk: "درآمد لحظه‌ای",
    reward: { coins: 280, gems: 9, xp: 32 },
  },
};

export function SceneCard({ scene }: { scene: SceneId }) {
  const { setActiveScene, addReward, pushToast } = useGame();
  const info = SCENES[scene];

  return (
    <div className="pointer-events-auto pop-in absolute bottom-24 right-4 w-[20rem]">
      <div className="loco-panel px-4 py-4">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-2 border-white bg-[linear-gradient(180deg,#ffe8a8,#f6c25a)] text-2xl shadow-[0_0_0_3px_#a8631b]">
            {info.icon}
          </span>
          <div className="leading-tight">
            <h3 className="text-lg font-black text-amber-950">{info.title}</h3>
            <p className="text-[0.82rem] font-bold text-amber-800">{info.blurb}</p>
            <p className="mt-1 text-[0.78rem] font-bold text-emerald-800">✨ {info.perk}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            className="loco-btn flex-1 px-3 py-2 text-sm"
            onClick={() => {
              addReward(info.reward);
              setActiveScene(null);
            }}
          >
            کار در این مکان
          </button>
          <button type="button" className="loco-btn loco-btn-blue px-3 py-2 text-sm" onClick={() => setActiveScene(null)}>
            بعداً
          </button>
        </div>
        <button
          type="button"
          onClick={() => pushToast({ text: `${info.title}: همه‌چیز مرتب است`, icon: info.icon })}
          className="mt-2 w-full text-[0.75rem] font-bold text-amber-700 underline decoration-dotted"
        >
          گزارش وضعیت ساختمان
        </button>
      </div>
    </div>
  );
}
