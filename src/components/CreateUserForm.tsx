"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CreateUserForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create user");
        return;
      }
      setName("");
      setUsername("");
      setPassword("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="surface rounded-2xl p-5">
      <h2 className="font-[family-name:var(--font-display)] text-xl">Add login</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-[var(--ink-soft)]">
          Full name
          <input
            className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2.5"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="text-sm text-[var(--ink-soft)]">
          Username
          <input
            className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2.5"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label className="text-sm text-[var(--ink-soft)]">
          Password
          <input
            type="password"
            className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2.5"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>
      </div>
      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="mt-4 rounded-xl bg-[var(--moss)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--moss-deep)] disabled:opacity-60"
      >
        {loading ? "Saving…" : "Create login"}
      </button>
    </form>
  );
}
