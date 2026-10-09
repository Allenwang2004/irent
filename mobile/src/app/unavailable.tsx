import Link from "next/link";

export function Unavailable({ message }: { message: string }) {
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16 text-center">
      <p className="text-ink-2">{message}</p>
      <Link href="/" className="mt-6 rounded-full border border-line px-6 py-3 text-sm">
        回到首頁
      </Link>
    </main>
  );
}
