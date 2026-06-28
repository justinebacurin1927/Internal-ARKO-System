"use client";

import { Suspense } from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { authenticate } from "./actions";

function LoginForm() {
  const [error, formAction, pending] = useActionState(authenticate, undefined);
  const callbackUrl = useSearchParams().get("callbackUrl") ?? "/board";

  return (
    <form
      action={formAction}
      className="w-full max-w-sm space-y-4 rounded-xl border border-gray-200 bg-white p-8 shadow-sm"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ARKO</h1>
        <p className="text-sm text-gray-500">Internal collaboration platform</p>
      </div>

      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <label className="block text-sm font-medium text-gray-700">
        Email
        <input
          name="email"
          type="email"
          required
          defaultValue="admin@arko.local"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-900 focus:outline-none"
        />
      </label>

      <label className="block text-sm font-medium text-gray-700">
        Password
        <input
          name="password"
          type="password"
          required
          defaultValue="password123"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-900 focus:outline-none"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-gray-900 py-2 font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
