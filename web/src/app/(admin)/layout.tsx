import Link from "next/link";
import { Suspense } from "react";
import { countOpenCases, countOpenWorkOrders } from "@/lib/alerts";
import { logout } from "../login/actions";

const NAV = [
  { href: "/alerts", label: "預警", count: countOpenCases },
  { href: "/work-orders", label: "工單", count: countOpenWorkOrders },
  { href: "/inspections", label: "取還車紀錄" },
  { href: "/vehicles", label: "車輛" },
  { href: "/reviews", label: "顧客評論" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line bg-surface-1">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <span className="font-semibold">iRent 營運後台</span>
          <nav className="flex flex-1 flex-wrap gap-4 text-sm text-ink-2">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-1.5 hover:text-ink">
                {item.label}
                {item.count && (
                  <Suspense fallback={null}>
                    <Badge count={item.count} />
                  </Suspense>
                )}
              </Link>
            ))}
          </nav>
          <form action={logout}>
            <button type="submit" className="text-sm text-ink-2 hover:text-ink">
              登出
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}

// Open items waiting for staff. The proxy has already checked the login.
async function Badge({ count }: { count: () => Promise<number> }) {
  const n = await count().catch(() => 0);
  if (!n) return null;
  return (
    <span className="rounded-full bg-accent px-1.5 py-0.5 text-xs leading-none font-medium text-white tabular-nums">
      {n}
    </span>
  );
}
