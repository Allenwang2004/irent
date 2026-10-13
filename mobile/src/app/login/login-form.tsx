"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="flex flex-col gap-1 text-[13px]">
        <span className="text-ink-2">密碼</span>
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          className="h-12 rounded-lg border border-line bg-white px-3 text-[15px]"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-[13px] text-accent">
          {state.error}，請再試一次
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex h-12 w-full items-center justify-center rounded-full bg-accent text-[15px] text-accent-ink disabled:opacity-50"
      >
        {pending ? "登入中..." : "進入展示"}
      </button>
    </form>
  );
}
