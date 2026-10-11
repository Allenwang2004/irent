import Link from "next/link";
import { ChevronLeft, Close, Headset } from "./icons";

// iRent's top bar: back (or close) on the left, title in the middle, customer
// service on the right, and a red progress line underneath. Sizes follow the
// app's screenshots (40px bar, 16px title, 3px line).
export function AppBar({
  title,
  back,
  onBack,
  close = false,
  progress,
}: {
  title: string;
  // A link, or a handler when leaving needs confirming; neither hides the button.
  back?: string;
  onBack?: () => void;
  // Show a cross instead of the back arrow (the in-use page).
  close?: boolean;
  // 0 to 1; omitted for pages outside a step-by-step flow.
  progress?: number;
}) {
  const icon = close ? <Close className="h-[22px] w-[22px]" /> : <ChevronLeft className="h-[22px] w-[22px]" />;
  const label = close ? "關閉" : "返回";
  const backClass = "-ml-1 flex h-10 w-10 items-center justify-center justify-self-start text-[#7b7d82]";
  return (
    <header className="sticky top-0 z-[5] shrink-0 bg-white">
      <div className="grid h-10 grid-cols-[3rem_1fr_3rem] items-center px-4">
        {back ? (
          <Link href={back} aria-label={label} className={backClass}>
            {icon}
          </Link>
        ) : onBack ? (
          <button type="button" onClick={onBack} aria-label={label} className={backClass}>
            {icon}
          </button>
        ) : (
          <span />
        )}
        <h1 className="text-center text-base text-[#333]">{title}</h1>
        {/* Customer service is out of scope for the demo. */}
        <span className="justify-self-end text-[#7b7d82]" aria-hidden>
          <Headset className="h-6 w-6" />
        </span>
      </div>
      <div className="h-[3px]">
        {progress !== undefined && (
          <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
        )}
      </div>
    </header>
  );
}
