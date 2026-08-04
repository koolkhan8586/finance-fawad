"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, todayISODate } from "@/lib/format";
import { BASE_CURRENCY, CURRENCIES, toPkr } from "@/lib/currency";

type Member = { id: number; name: string };
type TxType = "gave" | "received" | "expense" | "settlement" | "adjustment";

export type EditableTransaction = {
  id: number;
  type: TxType;
  amount: number;
  currency: string;
  original_amount: number | null;
  exchange_rate: number | null;
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
  const [currency, setCurrency] = useState(BASE_CURRENCY);
  const [exchangeRate, setExchangeRate] = useState("");
  const [description, setDescription] = useState("");
  const [occurredOn, setOccurredOn] = useState(todayISODate());
  const [fromUserId, setFromUserId] = useState(currentUserId);
  const [toUserId, setToUserId] = useState(other?.id || currentUserId);
  const [paidByUserId, setPaidByUserId] = useState(currentUserId);
  const [splitWithUserId, setSplitWithUserId] = useState(other?.id || currentUserId);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);

  useEffect(() => {
    if (editing) {
      setType(editing.type);
      const orig = editing.original_amount ?? editing.amount;
      setAmount(String(orig));
      setCurrency(editing.currency || BASE_CURRENCY);
      setExchangeRate(
        editing.currency && editing.currency !== BASE_CURRENCY
          ? String(editing.exchange_rate || "")
          : ""
      );
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
    setCurrency(BASE_CURRENCY);
    setExchangeRate("");
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
        return "You sent money — they now owe you that amount (stored in PKR).";
      case "received":
        return "They paid you back, or sent you money.";
      case "expense":
        return "One person paid a bill; cost is split 50/50 in PKR.";
      case "settlement":
        return "Someone paid to clear part of what they owed.";
      case "adjustment":
        return "Manual fix if a balance needs correcting.";
      default:
        return "";
    }
  }, [type]);

  const pkrPreview = useMemo(() => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return null;
    try {
      if (currency === BASE_CURRENCY) return value;
      const rate = Number(exchangeRate);
      if (!Number.isFinite(rate) || rate <= 0) return null;
      return toPkr(value, currency, rate);
    } catch {
      return null;
    }
  }, [amount, currency, exchangeRate]);

  async function fetchSuggestedRate() {
    if (currency === BASE_CURRENCY) return;
    setRateLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/rates?from=${currency}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not fetch rate");
        return;
      }
      setExchangeRate(String(data.rate));
    } catch {
      setError("Could not fetch rate");
    } finally {
      setRateLoading(false);
    }
  }

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

    const rateNum = currency === BASE_CURRENCY ? 1 : Number(exchangeRate);
    if (currency !== BASE_CURRENCY && (!Number.isFinite(rateNum) || rateNum <= 0)) {
      setError("Enter today's rate: how many PKR for 1 " + currency);
      setLoading(false);
      return;
    }

    const base = {
      type,
      amount: value,
      currency,
      exchangeRate: rateNum,
      description,
      occurredOn,
    };

    const payload =
      type === "expense"
        ? { ...base, paidByUserId, splitWithUserId }
        : { ...base, fromUserId, toUserId };

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
        if (currency === BASE_CURRENCY) setExchangeRate("");
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
                ? value === "gave" || value === "settlement"
                  ? "bg-[var(--debit)] text-white"
                  : value === "received"
                    ? "bg-[var(--credit)] text-white"
                    : "bg-[var(--moss)] text-white"
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
          Currency
          <select
            className="field"
            value={currency}
            onChange={(e) => {
              const next = e.target.value;
              setCurrency(next);
              if (next === BASE_CURRENCY) setExchangeRate("");
            }}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-[var(--ink-soft)]">
          Amount ({currency})
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
      </div>

      {currency !== BASE_CURRENCY ? (
        <div className="mt-3 rounded-xl border border-[var(--line)] bg-white/70 p-3">
          <label className="block text-sm text-[var(--ink-soft)]">
            Today&apos;s rate (PKR per 1 {currency})
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.0001"
              className="field"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              placeholder="e.g. 76.50"
              required
            />
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fetchSuggestedRate}
              disabled={rateLoading}
              className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--moss)] hover:bg-white disabled:opacity-60"
            >
              {rateLoading ? "Fetching…" : "Suggest market rate"}
            </button>
            <span className="text-xs text-[var(--ink-soft)]">
              Edit if your cash/shop rate is different.
            </span>
          </div>
          {pkrPreview != null ? (
            <p className="mt-2 text-sm font-semibold text-[var(--ink)]">
              = {formatMoney(pkrPreview)} in total
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
        {currency === BASE_CURRENCY && pkrPreview != null ? (
          <div className="flex items-end text-sm text-[var(--ink-soft)]">
            Ledger total: <span className="ml-1 font-semibold text-[var(--ink)]">{formatMoney(pkrPreview)}</span>
          </div>
        ) : (
          <div />
        )}
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
