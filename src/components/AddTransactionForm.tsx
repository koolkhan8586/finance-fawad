"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { todayISODate } from "@/lib/format";

type Member = { id: number; name: string };
type TxType = "gave" | "received" | "expense" | "settlement" | "adjustment";

export function AddTransactionForm({
  bookId,
  members,
  currentUserId,
}: {
  bookId: number;
  members: Member[];
  currentUserId: number;
}) {
  const router = useRouter();
  const other = members.find((m) => m.id !== currentUserId) || members[0];

  const [type, setType] = useState<TxType>("gave");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [occurredOn, setOccurredOn] = useState(todayISODate());
  const [fromUserId, setFromUserId] = useState(currentUserId);
  const [toUserId, setToUserId] = useState(other?.id || currentUserId);
  const [paidByUserId, setPaidByUserId] = useState(currentUserId);
  const [splitWithUserId, setSplitWithUserId] = useState(other?.id || currentUserId);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const typeHelp = useMemo(() => {
    switch (type) {
      case "gave":
        return "You (or someone) gave cash/transfer — the receiver now owes that amount.";
      case "received":
        return "Money came back (repayment) or someone sent you money.";
      case "expense":
        return "One person paid a bill for both; the cost is split 50/50.";
      case "settlement":
        return "Someone paid to clear part of what they owed.";
      case "adjustment":
        return "Manual fix if a balance needs correcting.";
      default:
        return "";
    }
  }, [type]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid amount.");
      setLoading(false);
      return;
    }

    const payload =
      type === "expense"
        ? {
            type,
            amount: value,
            description,
            occurredOn,
            paidByUserId,
            splitWithUserId,
          }
        : {
            type,
            amount: value,
            description,
            occurredOn,
            fromUserId,
            toUserId,
          };

    try {
      const res = await fetch(`/api/books/${bookId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save");
        return;
      }
      setAmount("");
      setDescription("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="surface rounded-2xl p-5">
      <h2 className="font-[family-name:var(--font-display)] text-xl">Add entry</h2>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">{typeHelp}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ["gave", "Gave money"],
            ["received", "Received"],
            ["expense", "Shared expense"],
            ["settlement", "Settlement"],
            ["adjustment", "Adjustment"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setType(value)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              type === value
                ? "bg-[var(--moss)] text-white"
                : "border border-[var(--line)] bg-white/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-[var(--ink-soft)]">
          Amount (PKR)
          <input
            type="number"
            min="0"
            step="0.01"
            className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2.5"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label className="text-sm text-[var(--ink-soft)]">
          Date
          <input
            type="date"
            className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2.5"
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            required
          />
        </label>
      </div>

      {type === "expense" ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-[var(--ink-soft)]">
            Who paid
            <select
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2.5"
              value={paidByUserId}
              onChange={(e) => setPaidByUserId(Number(e.target.value))}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-[var(--ink-soft)]">
            Split with
            <select
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2.5"
              value={splitWithUserId}
              onChange={(e) => setSplitWithUserId(Number(e.target.value))}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-[var(--ink-soft)]">
            From
            <select
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2.5"
              value={fromUserId}
              onChange={(e) => setFromUserId(Number(e.target.value))}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-[var(--ink-soft)]">
            To
            <select
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2.5"
              value={toUserId}
              onChange={(e) => setToUserId(Number(e.target.value))}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <label className="mt-3 block text-sm text-[var(--ink-soft)]">
        Note (optional)
        <input
          className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2.5"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="JazzCash, dinner, rent help…"
        />
      </label>

      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 rounded-xl bg-[var(--moss)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--moss-deep)] disabled:opacity-60"
      >
        {loading ? "Saving…" : "Save entry"}
      </button>
    </form>
  );
}
