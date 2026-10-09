import Link from "next/link";
import { logout } from "../login/actions";

const NAV = [
  { href: "/alerts", label: "預警" },
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
          <nav className="flex flex-1 gap-4 text-sm text-ink-2">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-ink">
                {item.label}
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
