"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { todayISODate } from "@/lib/format";

type Member = { id: number; name: string };
type TxType = "gave" | "received" | "expense" | "settlement" | "adjustment";

export type EditableTransaction = {
  id: number;
  type: TxType;
  amount: number;
  description: string | null;
  occurred_on: string;
  from_user_id: number | null;
  to_user_id: number | null;
  paid_by_user_id: number | null;
  split_with_user_id: number | null;
};

const TYPES: { value: TxType; short: string; full: string }[] = [
  { value: "gave", short: "Gave", full: "Gave money" },
  { value: "received", short: "Received", full: "Received" },
  { value: "expense", short: "Expense", full: "Shared expense" },
  { value: "settlement", short: "Settle", full: "Settlement" },
  { value: "adjustment", short: "Adjust", full: "Adjustment" },
];

export function AddTransactionForm({
  bookId,
  members,
  currentUserId,
  editing,
  onCancelEdit,
}: {
  bookId: number;
  members: Member[];
  currentUserId: number;
  editing?: EditableTransaction | null;
  onCancelEdit?: () => void;
}) {
  const router = useRouter();
  const other = members.find((m) => m.id !== currentUserId) || members[0];
  const isEditing = Boolean(editing);

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

  useEffect(() => {
    if (editing) {
      setType(editing.type);
      setAmount(String(editing.amount));
      setDescription(editing.description || "");
      setOccurredOn(editing.occurred_on);
      setFromUserId(editing.from_user_id || currentUserId);
      setToUserId(editing.to_user_id || other?.id || currentUserId);
      setPaidByUserId(editing.paid_by_user_id || currentUserId);
      setSplitWithUserId(editing.split_with_user_id || other?.id || currentUserId);
      setError("");
      return;
    }
    setType("gave");
    setAmount("");
    setDescription("");
    setOccurredOn(todayISODate());
    setFromUserId(currentUserId);
    setToUserId(other?.id || currentUserId);
    setPaidByUserId(currentUserId);
    setSplitWithUserId(other?.id || currentUserId);
    setError("");
  }, [editing, currentUserId, other?.id]);

  const typeHelp = useMemo(() => {
    switch (type) {
      case "gave":
        return "You sent money — they now owe you that amount.";
      case "received":
        return "They paid you back, or sent you money.";
      case "expense":
        return "One person paid a bill; cost is split 50/50.";
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
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing ? { ...payload, transactionId: editing!.id } : payload
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save");
        return;
      }
      if (!isEditing) {
        setAmount("");
        setDescription("");
      }
      onCancelEdit?.();
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      id="entry-form"
      onSubmit={onSubmit}
      className={`surface rounded-2xl p-4 sm:p-5 ${isEditing ? "ring-2 ring-[var(--leaf)]" : ""}`}
    >
      <h2 className="font-[family-name:var(--font-display)] text-xl">
        {isEditing ? "Edit entry" : "Add entry"}
      </h2>
      <p className="mt-1 text-sm leading-snug text-[var(--ink-soft)]">{typeHelp}</p>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
        {TYPES.map(({ value, short, full }) => (
          <button
            key={value}
            type="button"
            onClick={() => setType(value)}
            className={`min-h-11 rounded-xl px-2 py-2.5 text-sm font-medium sm:min-h-0 sm:rounded-lg sm:px-3 sm:py-1.5 ${
              type === value
                ? "bg-[var(--moss)] text-white"
                : "border border-[var(--line)] bg-white/70"
            } ${value === "adjustment" ? "col-span-3 sm:col-span-1" : ""}`}
          >
            <span className="sm:hidden">{short}</span>
            <span className="hidden sm:inline">{full}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-[var(--ink-soft)]">
          Amount (PKR)
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className="field"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            required
          />
        </label>
        <label className="text-sm text-[var(--ink-soft)]">
          Date
          <input
            type="date"
            className="field"
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
              className="field"
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
              className="field"
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
              className="field"
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
              className="field"
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
          className="field"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="JazzCash, dinner, rent help…"
        />
      </label>

      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
          {loading ? "Saving…" : isEditing ? "Update entry" : "Save entry"}
        </button>
        {isEditing ? (
          <button
            type="button"
            onClick={onCancelEdit}
            className="w-full rounded-xl border border-[var(--line)] px-4 py-3 text-sm sm:w-auto sm:py-2"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
