"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { todayISODate } from "@/lib/format";

export function CreateEventForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState(todayISODate());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, eventDate: eventDate || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create event");
        return;
      }
      setTitle("");
      setDescription("");
      setOpen(false);
      router.push(`/events/${data.id}`);
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
        New event budget
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="surface rounded-2xl p-4 sm:p-5">
      <h2 className="font-[family-name:var(--font-display)] text-xl">Plan an event</h2>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">
        Set a budget for a party, wedding, trip, or any event — then track actual spend.
      </p>
      <label className="mt-4 block text-sm text-[var(--ink-soft)]">
        Event name
        <input
          className="field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Birthday party, Eid dinner"
          required
        />
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-[var(--ink-soft)]">
          Date
          <input
            type="date"
            className="field"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </label>
        <label className="text-sm text-[var(--ink-soft)]">
          Note (optional)
          <input
            className="field"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Location, guests…"
          />
        </label>
      </div>
      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
          {loading ? "Creating…" : "Create event"}
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
