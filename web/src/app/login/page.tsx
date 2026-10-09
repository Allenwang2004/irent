import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "登入 | iRent 營運後台" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface-1 p-6">
        <h1 className="text-xl font-semibold">iRent 營運後台</h1>
        <p className="mt-1 mb-5 text-sm text-ink-2">請輸入營運團隊的共用密碼</p>
        <Suspense fallback={<LoginForm />}>
          <LoginFormWithNext searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function LoginFormWithNext({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : undefined} />;
}
