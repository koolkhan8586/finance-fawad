"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231f6a4f' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <section className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-10 sm:px-6 sm:py-16 lg:px-10">
        <div className="max-w-xl">
          <p className="fade-up brand-mark font-[family-name:var(--font-display)] text-5xl leading-none text-[var(--moss-deep)] sm:text-7xl">
            Loan
          </p>
          <h1 className="fade-up-delay mt-4 max-w-md font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--ink)] sm:mt-5 sm:text-4xl">
            Shared money books for family and friends.
          </h1>
          <p className="fade-up-delay-2 mt-3 max-w-md text-[15px] leading-relaxed text-[var(--ink-soft)] sm:mt-4 sm:text-lg">
            Log loans, repayments, and shared expenses — each person sees only their books.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="fade-up-delay-2 surface mt-8 w-full max-w-md rounded-2xl p-5 shadow-[var(--shadow)] sm:mt-12 sm:p-8"
        >
          <label className="block text-sm font-medium text-[var(--ink-soft)]">
            Username
            <input
              className="field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              required
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-[var(--ink-soft)]">
            Password
            <input
              type="password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <p className="mt-4 text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
