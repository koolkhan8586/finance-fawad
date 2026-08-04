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
    <form onSubmit={onSubmit} className="surface rounded-2xl p-4 sm:p-5">
      <h2 className="font-[family-name:var(--font-display)] text-xl">Add login</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-[var(--ink-soft)]">
          Full name
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="text-sm text-[var(--ink-soft)]">
          Username
          <input
            className="field"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            required
          />
        </label>
        <label className="text-sm text-[var(--ink-soft)]">
          Password
          <input
            type="password"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>
      </div>
      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
      <button type="submit" disabled={loading} className="btn-primary mt-4 w-full sm:w-auto">
        {loading ? "Saving…" : "Create login"}
      </button>
    </form>
  );
}
