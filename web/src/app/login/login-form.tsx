"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-2">密碼</span>
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          className="rounded border border-line bg-surface-1 px-3 py-2"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-ink">
          {state.error}，請再試一次
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "登入中..." : "登入"}
      </button>
    </form>
  );
}
