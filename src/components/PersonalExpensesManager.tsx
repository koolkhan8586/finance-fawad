"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { formatMoney, todayISODate } from "@/lib/format";
import { PERSONAL_CATEGORIES } from "@/lib/categories";

type Expense = {
  id: number;
  amount: number;
  currency: string;
  category: string;
  description: string | null;
  occurred_on: string;
};

type Summary = {
  allTime: number;
  thisMonth: number;
  byCategory: { category: string; total: number }[];
};

export function PersonalExpensesManager({
  expenses,
  summary,
}: {
  expenses: Expense[];
  summary: Summary;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(PERSONAL_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [occurredOn, setOccurredOn] = useState(todayISODate());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    if (filter === "all") return expenses;
    return expenses.filter((e) => e.category === filter);
  }, [expenses, filter]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid amount.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: value,
          category,
          description,
          occurredOn,
        }),
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

  function startEdit(exp: Expense) {
    setEditingId(exp.id);
    setAmount(String(exp.amount));
    setCategory(exp.category);
    setDescription(exp.description || "");
    setOccurredOn(exp.occurred_on);
  }

  function cancelEdit() {
    setEditingId(null);
    setAmount("");
    setCategory(PERSONAL_CATEGORIES[0]);
    setDescription("");
    setOccurredOn(todayISODate());
  }

  async function onUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/expenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          amount: Number(amount),
          category,
          description,
          occurredOn,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not update");
        return;
      }
      cancelEdit();
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Delete this expense?")) return;
    setLoading(true);
    try {
      await fetch("/api/expenses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (editingId === id) cancelEdit();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[var(--debit)]/20 bg-[var(--debit-soft)] px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-[var(--debit)]">This month</p>
          <p className="mt-1 text-lg font-bold text-[var(--debit)] sm:text-xl">
            {formatMoney(summary.thisMonth)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-soft)]">All time</p>
          <p className="mt-1 text-lg font-bold text-[var(--ink)] sm:text-xl">
            {formatMoney(summary.allTime)}
          </p>
        </div>
      </div>

      {summary.byCategory.length > 0 ? (
        <div className="surface rounded-2xl p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
            This month by category
          </p>
          <ul className="mt-3 space-y-2">
            {summary.byCategory.slice(0, 6).map((row) => {
              const pct =
                summary.thisMonth > 0
                  ? Math.round((row.total / summary.thisMonth) * 100)
                  : 0;
              return (
                <li key={row.category}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-[var(--ink)]">{row.category}</span>
                    <span className="font-medium text-[var(--debit)]">
                      {formatMoney(row.total)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/80 ring-1 ring-[var(--line)]">
                    <div
                      className="h-full rounded-full bg-[var(--debit)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <form
        onSubmit={editingId ? onUpdate : onAdd}
        className="surface rounded-2xl p-4 sm:p-5"
      >
        <h2 className="font-[family-name:var(--font-display)] text-xl">
          {editingId ? "Edit expense" : "Add expense"}
        </h2>
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
            Category
            <select
              className="field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {PERSONAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
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
          <label className="text-sm text-[var(--ink-soft)]">
            Note (optional)
            <input
              className="field"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Lunch, petrol, medicines…"
            />
          </label>
        </div>
        {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
            {loading ? "Saving…" : editingId ? "Update expense" : "Save expense"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={cancelEdit}
              className="w-full rounded-xl border border-[var(--line)] px-4 py-3 text-sm sm:w-auto sm:py-2"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">History</h2>
          <select
            className="rounded-lg border border-[var(--line)] bg-white/80 px-3 py-1.5 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All categories</option>
            {PERSONAL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {filtered.length === 0 ? (
          <p className="surface mt-4 rounded-2xl px-4 py-8 text-[var(--ink-soft)]">
            No expenses yet. Add your first one above.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {filtered.map((exp) => (
              <li
                key={exp.id}
                className={`rounded-2xl px-4 py-4 sm:px-5 ${
                  editingId === exp.id ? "tx-neutral ring-2 ring-[var(--leaf)]" : "tx-out"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[var(--debit)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                        {exp.category}
                      </span>
                      <p className="text-lg font-bold text-[var(--debit)]">
                        −{formatMoney(exp.amount, exp.currency)}
                      </p>
                    </div>
                    {exp.description ? (
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">{exp.description}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-[var(--ink-soft)]">
                      {format(new Date(exp.occurred_on + "T12:00:00"), "d MMM yyyy")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(exp)}
                      className="text-xs font-medium text-[var(--moss)] hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(exp.id)}
                      className="text-xs text-[var(--ink-soft)] hover:text-[var(--danger)]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
