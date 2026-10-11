import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getRentalInUse, hasLockedReturn } from "@/lib/vehicles";
import { AppBar } from "../../app-bar";
import { CarArt } from "../../car-art";
import {
  CarReport,
  Contract,
  DashCam,
  DoorCard,
  Info,
  Lock,
  Navigate,
  PairDevice,
  Parking,
  PlayVideo,
  SteeringWheel,
} from "../../icons";
import { Unavailable } from "../../unavailable";
import { DueBack, ElapsedTime, StartReturnButton } from "./in-use";

type Params = Promise<{ rentalId: string }>;

// iRent's 用車頁. Only "start return" does anything in the demo; the rest is
// laid out as in the app, with illustrative station and due-back details.
export default function RentalPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-ink-3">載入中...</p>}>
      <RentalContent params={params} />
    </Suspense>
  );
}

const SHORTCUTS = [
  { label: "車況回報", Icon: CarReport },
  { label: "教學影片", Icon: PlayVideo },
  { label: "操作教學", Icon: SteeringWheel },
  { label: "臨時停車", Icon: Parking },
  { label: "開關門卡", Icon: DoorCard },
  { label: "配對裝置", Icon: PairDevice },
  { label: "租車合約", Icon: Contract },
  { label: "行車紀錄", Icon: DashCam },
];

// Demo station; the simulation has no stations.
const STATION = { name: "iRent 金華公園站", address: "台北市大安區金華街254巷1號～B1" };

async function RentalContent({ params }: { params: Params }) {
  const id = Number((await params).rentalId);
  if (!Number.isInteger(id)) notFound();
  const rental = await getRentalInUse(id);
  if (!rental?.vehicle) notFound();
  if (rental.status !== "in_use") {
    return <Unavailable message="這筆租用已經還車或尚未完成取車。" />;
  }
  const locked = await hasLockedReturn(rental.id);
  return (
    <main className="flex flex-1 flex-col bg-surface-0">
      <AppBar title="用車頁" back="/" close />
      <section className="flex items-center justify-between pt-6 pr-5 pl-8">
        <div>
          <span className="rounded-sm bg-irent-blue px-1.5 py-0.5 text-xs text-white">同站</span>
          <div className="mt-2.5 text-[26px] leading-9 font-bold text-[#141516]">{rental.vehicle.plate}</div>
        </div>
        <CarArt className="w-[140px]" />
      </section>

      <section className="mx-5 mt-4 flex h-[104px] flex-col items-center justify-center rounded-xl bg-white">
        <div className="text-sm text-ink-2">已使用時間</div>
        {rental.pickedUpAt ? (
          <ElapsedTime since={rental.pickedUpAt} />
        ) : (
          <div className="mt-1 text-[34px] font-extrabold tabular-nums text-[#141516]">-- : -- : --</div>
        )}
      </section>

      <section className="mx-5 mt-3 divide-y divide-line rounded-xl bg-white px-[17px]">
        <div className="py-4">
          <div className="flex items-center justify-between text-base">
            <span className="text-[#333]">預計還車時間</span>
            {rental.pickedUpAt && <DueBack since={rental.pickedUpAt} />}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-ink-3">若使用時間可能延後，請先申請延長。</span>
            <span className="shrink-0 rounded-full bg-irent-blue-soft px-4 py-1.5 text-[15px] font-medium text-irent-blue">
              延長申請
            </span>
          </div>
        </div>
        <div className="py-4">
          <div className="text-base text-[#333]">還車站點</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-1 text-base text-ink-2">
                {STATION.name}
                <Info className="h-4 w-4" />
              </div>
              <div className="mt-1 text-xs text-ink-3">{STATION.address}</div>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-[15px] text-irent-blue">
              導航
              <Navigate className="h-4 w-4" />
            </span>
          </div>
        </div>
      </section>

      <ul className="mx-5 mt-3 mb-4 grid grid-cols-4 gap-y-4 rounded-xl bg-white py-4 text-center">
        {SHORTCUTS.map(({ label, Icon }) => (
          <li key={label} className="flex flex-col items-center gap-1.5 text-xs font-medium text-[#4d4f52]">
            <Icon className="h-[25px] w-[25px] text-[#6b6d72]" />
            {label}
          </li>
        ))}
      </ul>

      <div className="sticky bottom-0 mt-auto bg-white px-[25px] pt-[15px] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {locked ? (
          <p className="py-3 text-center text-sm text-ink-2">車門已經鎖上，但外部照片沒有完成。請聯絡客服協助完成還車。</p>
        ) : (
          <div className="flex items-center gap-5">
            <span className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-full bg-irent-blue text-base text-white">
              <Lock className="h-5 w-5" />
              開車門
            </span>
            <StartReturnButton rentalId={rental.id} />
          </div>
        )}
      </div>
    </main>
  );
}
