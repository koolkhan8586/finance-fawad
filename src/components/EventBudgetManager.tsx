"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";
import { DEFAULT_EVENT_CATEGORIES } from "@/lib/categories";

type Line = {
  id: number;
  category: string;
  planned_amount: number;
  actual_amount: number;
  notes: string | null;
};

export function EventBudgetManager({
  eventId,
  lines,
}: {
  eventId: number;
  lines: Line[];
}) {
  const router = useRouter();
  const [category, setCategory] = useState<string>(DEFAULT_EVENT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [planned, setPlanned] = useState("");
  const [actual, setActual] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editPlanned, setEditPlanned] = useState("");
  const [editActual, setEditActual] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const totals = useMemo(() => {
    const plannedTotal = lines.reduce((s, l) => s + Number(l.planned_amount || 0), 0);
    const actualTotal = lines.reduce((s, l) => s + Number(l.actual_amount || 0), 0);
    return { plannedTotal, actualTotal, variance: plannedTotal - actualTotal };
  }, [lines]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const cat = category === "__custom__" ? customCategory.trim() : category;
    if (!cat) {
      setError("Enter a category.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/events/${eventId}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: cat,
          plannedAmount: Number(planned) || 0,
          actualAmount: Number(actual) || 0,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not add");
        return;
      }
      setPlanned("");
      setActual("");
      setNotes("");
      setCustomCategory("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(line: Line) {
    setEditingId(line.id);
    setEditCategory(line.category);
    setEditPlanned(String(line.planned_amount || ""));
    setEditActual(String(line.actual_amount || ""));
    setEditNotes(line.notes || "");
  }

  async function onUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/lines`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineId: editingId,
          category: editCategory,
          plannedAmount: Number(editPlanned) || 0,
          actualAmount: Number(editActual) || 0,
          notes: editNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not update");
        return;
      }
      setEditingId(null);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(lineId: number) {
    if (!confirm("Delete this budget line?")) return;
    setLoading(true);
    try {
      await fetch(`/api/events/${eventId}/lines`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-3 py-3 sm:px-4">
          <p className="text-[10px] uppercase tracking-wide text-[var(--ink-soft)] sm:text-xs">
            Planned
          </p>
          <p className="mt-1 text-sm font-bold text-[var(--ink)] sm:text-lg">
            {formatMoney(totals.plannedTotal)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--debit)]/20 bg-[var(--debit-soft)] px-3 py-3 sm:px-4">
          <p className="text-[10px] uppercase tracking-wide text-[var(--debit)] sm:text-xs">
            Actual
          </p>
          <p className="mt-1 text-sm font-bold text-[var(--debit)] sm:text-lg">
            {formatMoney(totals.actualTotal)}
          </p>
        </div>
        <div
          className={`rounded-2xl border px-3 py-3 sm:px-4 ${
            totals.variance >= 0
              ? "border-[var(--credit)]/20 bg-[var(--credit-soft)]"
              : "border-[var(--debit)]/20 bg-[var(--debit-soft)]"
          }`}
        >
          <p
            className={`text-[10px] uppercase tracking-wide sm:text-xs ${
              totals.variance >= 0 ? "text-[var(--credit)]" : "text-[var(--debit)]"
            }`}
          >
            {totals.variance >= 0 ? "Under" : "Over"}
          </p>
          <p
            className={`mt-1 text-sm font-bold sm:text-lg ${
              totals.variance >= 0 ? "text-[var(--credit)]" : "text-[var(--debit)]"
            }`}
          >
            {formatMoney(Math.abs(totals.variance))}
          </p>
        </div>
      </div>

      {totals.plannedTotal > 0 ? (
        <div className="surface rounded-2xl p-4">
          <div className="mb-1.5 flex justify-between text-xs text-[var(--ink-soft)]">
            <span>Budget used</span>
            <span>
              {Math.min(100, Math.round((totals.actualTotal / totals.plannedTotal) * 100))}%
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/80 ring-1 ring-[var(--line)]">
            <div
              className={`h-full rounded-full transition-all ${
                totals.actualTotal > totals.plannedTotal
                  ? "bg-[var(--debit)]"
                  : "bg-[var(--credit)]"
              }`}
              style={{
                width: `${Math.min(100, (totals.actualTotal / totals.plannedTotal) * 100)}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      <form onSubmit={onAdd} className="surface rounded-2xl p-4 sm:p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Add budget line</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-[var(--ink-soft)]">
            Category
            <select
              className="field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {DEFAULT_EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__custom__">Custom…</option>
            </select>
          </label>
          {category === "__custom__" ? (
            <label className="text-sm text-[var(--ink-soft)]">
              Custom name
              <input
                className="field"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                required
              />
            </label>
          ) : (
            <label className="text-sm text-[var(--ink-soft)]">
              Note (optional)
              <input className="field" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          )}
          <label className="text-sm text-[var(--ink-soft)]">
            Planned (PKR)
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className="field"
              value={planned}
              onChange={(e) => setPlanned(e.target.value)}
              placeholder="0"
            />
          </label>
          <label className="text-sm text-[var(--ink-soft)]">
            Actual (PKR)
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className="field"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              placeholder="0"
            />
          </label>
        </div>
        {category === "__custom__" ? (
          <label className="mt-3 block text-sm text-[var(--ink-soft)]">
            Note (optional)
            <input className="field" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        ) : null}
        {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
        <button type="submit" disabled={loading} className="btn-primary mt-4 w-full sm:w-auto">
          {loading ? "Saving…" : "Add line"}
        </button>
      </form>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Budget lines</h2>
        {lines.length === 0 ? (
          <p className="surface mt-4 rounded-2xl px-4 py-8 text-[var(--ink-soft)]">
            No lines yet. Add categories with planned and actual amounts above.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {lines.map((line) => {
              const diff = Number(line.planned_amount) - Number(line.actual_amount);
              return (
                <li key={line.id} className="surface rounded-2xl px-4 py-4 sm:px-5">
                  {editingId === line.id ? (
                    <form onSubmit={onUpdate} className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-sm text-[var(--ink-soft)]">
                          Category
                          <input
                            className="field"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            required
                          />
                        </label>
                        <label className="text-sm text-[var(--ink-soft)]">
                          Note
                          <input
                            className="field"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                          />
                        </label>
                        <label className="text-sm text-[var(--ink-soft)]">
                          Planned
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="field"
                            value={editPlanned}
                            onChange={(e) => setEditPlanned(e.target.value)}
                          />
                        </label>
                        <label className="text-sm text-[var(--ink-soft)]">
                          Actual
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="field"
                            value={editActual}
                            onChange={(e) => setEditActual(e.target.value)}
                          />
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="btn-primary" disabled={loading}>
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[var(--ink)]">{line.category}</p>
                        {line.notes ? (
                          <p className="mt-0.5 text-sm text-[var(--ink-soft)]">{line.notes}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-3 text-sm">
                          <span className="text-[var(--ink-soft)]">
                            Plan:{" "}
                            <strong className="text-[var(--ink)]">
                              {formatMoney(line.planned_amount)}
                            </strong>
                          </span>
                          <span className="text-[var(--debit)]">
                            Actual: <strong>{formatMoney(line.actual_amount)}</strong>
                          </span>
                          <span
                            className={
                              diff >= 0 ? "text-[var(--credit)]" : "text-[var(--debit)]"
                            }
                          >
                            {diff >= 0 ? "Left" : "Over"}:{" "}
                            <strong>{formatMoney(Math.abs(diff))}</strong>
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(line)}
                          className="text-xs font-medium text-[var(--moss)] hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(line.id)}
                          className="text-xs text-[var(--ink-soft)] hover:text-[var(--danger)]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
