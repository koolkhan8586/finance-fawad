"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CreateBookForm({
  members,
}: {
  members: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  function toggleMember(id: number) {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, memberIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create book");
        return;
      }
      setTitle("");
      setDescription("");
      setMemberIds([]);
      setOpen(false);
      router.push(`/books/${data.id}`);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary w-full sm:w-auto">
        New shared book
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="surface rounded-2xl p-4 sm:p-5">
      <h2 className="font-[family-name:var(--font-display)] text-xl">New shared book</h2>
      <label className="mt-4 block text-sm text-[var(--ink-soft)]">
        Title
        <input
          className="field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Brother"
          required
        />
      </label>
      <label className="mt-3 block text-sm text-[var(--ink-soft)]">
        Note (optional)
        <input
          className="field"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Family support, travel, etc."
        />
      </label>
      <fieldset className="mt-4">
        <legend className="text-sm text-[var(--ink-soft)]">Share with</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {members.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)]">Add people first on the People page.</p>
          ) : (
            members.map((m) => {
              const selected = memberIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMember(m.id)}
                  className={`min-h-11 rounded-xl px-3 py-2 text-sm ${
                    selected
                      ? "bg-[var(--moss)] text-white"
                      : "border border-[var(--line)] bg-white/70"
                  }`}
                >
                  {m.name}
                </button>
              );
            })
          )}
        </div>
      </fieldset>
      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={loading || memberIds.length === 0}
          className="btn-primary w-full disabled:opacity-50 sm:w-auto"
        >
          {loading ? "Creating…" : "Create book"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="w-full rounded-xl border border-[var(--line)] px-4 py-3 text-sm sm:w-auto sm:py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
