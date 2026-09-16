"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Member = {
  id: number;
  name: string;
  username: string;
  can_write: boolean;
};

type Person = {
  id: number;
  name: string;
};

export function BookMembersManager({
  bookId,
  members,
  people,
  creatorId,
}: {
  bookId: number;
  members: Member[];
  people: Person[];
  creatorId: number;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const memberIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);
  const addable = people.filter((p) => !memberIds.has(p.id));

  async function patchMember(body: {
    userId: number;
    action: "add" | "update" | "remove";
    canWrite?: boolean;
  }) {
    setLoadingId(body.userId);
    setError("");
    try {
      const res = await fetch(`/api/books/${bookId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not update permissions");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <section className="fade-up-delay mt-6 sm:mt-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-left transition hover:bg-white"
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--moss)]">
            Who can add entries
          </p>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Grant or revoke the right to record money in this book.
          </p>
        </div>
        <span className="text-sm text-[var(--moss)]">{open ? "Hide" : "Manage"}</span>
      </button>

      {open ? (
        <div className="surface mt-3 rounded-2xl p-4 sm:p-5">
          <ul className="space-y-3">
            {members.map((m) => {
              const isCreator = m.id === creatorId;
              const busy = loadingId === m.id;
              return (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--ink)]">
                      {m.name}
                      {isCreator ? (
                        <span className="ml-2 text-xs font-normal text-[var(--ink-soft)]">
                          (creator)
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-[var(--ink-soft)]">@{m.username}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={m.can_write}
                        disabled={busy || isCreator}
                        onChange={(e) =>
                          patchMember({
                            userId: m.id,
                            action: "update",
                            canWrite: e.target.checked,
                          })
                        }
                      />
                      Can add entries
                    </label>
                    {!isCreator ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          patchMember({ userId: m.id, action: "remove" })
                        }
                        className="rounded-xl px-3 py-2 text-sm text-[var(--danger)] hover:bg-red-50 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          {addable.length > 0 ? (
            <div className="mt-5">
              <p className="text-sm text-[var(--ink-soft)]">Add someone to this book</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {addable.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={loadingId === p.id}
                    onClick={() =>
                      patchMember({
                        userId: p.id,
                        action: "add",
                        canWrite: true,
                      })
                    }
                    className="min-h-11 rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2 text-sm hover:bg-white disabled:opacity-50"
                  >
                    + {p.name}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-[var(--ink-soft)]">
                New people get permission to add entries by default. You can turn it off above.
              </p>
            </div>
          ) : null}

          {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
