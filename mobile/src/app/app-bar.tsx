import Link from "next/link";

// iRent-style top bar: back on the left, title in the middle, customer service
// on the right, and a red progress line underneath.
export function AppBar({
  title,
  back,
  onBack,
  progress,
}: {
  title: string;
  // A link, or a handler when leaving needs confirming; neither hides the button.
  back?: string;
  onBack?: () => void;
  // 0 to 1; omitted for pages outside a step-by-step flow.
  progress?: number;
}) {
  const backClass = "justify-self-start text-sm text-ink-2";
  return (
    <header className="sticky top-0 z-[5] shrink-0 bg-surface-1">
      <div className="grid h-12 grid-cols-[4rem_1fr_4rem] items-center px-4">
        {back ? (
          <Link href={back} className={backClass}>
            返回
          </Link>
        ) : onBack ? (
          <button type="button" onClick={onBack} className={backClass}>
            返回
          </button>
        ) : (
          <span />
        )}
        <h1 className="text-center text-base font-medium">{title}</h1>
        {/* Customer service is out of scope for the demo. */}
        <span className="justify-self-end text-sm text-ink-3">客服</span>
      </div>
      <div className="h-0.5 bg-surface-2">
        {progress !== undefined && (
          <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
        )}
      </div>
    </header>
  );
}
