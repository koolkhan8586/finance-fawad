"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteEventButton({ eventId }: { eventId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this event and all its budget lines?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      if (!res.ok) {
        alert("Could not delete event.");
        return;
      }
      router.push("/events");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={loading}
      className="text-sm text-[var(--ink-soft)] hover:text-[var(--danger)]"
    >
      {loading ? "Deleting…" : "Delete event"}
    </button>
  );
}
