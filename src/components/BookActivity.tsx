"use client";

import { useState } from "react";
import { format } from "date-fns";
import { formatMoney, transactionLabel } from "@/lib/format";
import {
  AddTransactionForm,
  type EditableTransaction,
} from "@/components/AddTransactionForm";
import { DeleteTransactionButton } from "@/components/DeleteTransactionButton";

type Member = { id: number; name: string };

type TxRow = EditableTransaction & {
  currency: string;
  created_by_name?: string;
  from_user_name?: string | null;
  to_user_name?: string | null;
  paid_by_name?: string | null;
  split_with_name?: string | null;
};

export function BookActivity({
  bookId,
  members,
  currentUserId,
  transactions,
}: {
  bookId: number;
  members: Member[];
  currentUserId: number;
  transactions: TxRow[];
}) {
  const [editing, setEditing] = useState<EditableTransaction | null>(null);

  function startEdit(tx: TxRow) {
    setEditing({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      occurred_on: tx.occurred_on,
      from_user_id: tx.from_user_id,
      to_user_id: tx.to_user_id,
      paid_by_user_id: tx.paid_by_user_id,
      split_with_user_id: tx.split_with_user_id,
    });
    requestAnimationFrame(() => {
      document.getElementById("entry-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <>
      <div className="fade-up-delay mt-5 sm:mt-8">
        <AddTransactionForm
          bookId={bookId}
          members={members}
          currentUserId={currentUserId}
          editing={editing}
          onCancelEdit={() => setEditing(null)}
        />
      </div>

      <section className="fade-up-delay-2 mt-8 sm:mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Activity</h2>
        {transactions.length === 0 ? (
          <p className="surface mt-4 rounded-2xl px-4 py-8 text-[var(--ink-soft)] sm:px-5">
            No transactions yet. Add the first one above.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {transactions.map((tx, index) => (
              <li
                key={tx.id}
                className={`row-enter surface rounded-2xl px-4 py-4 sm:px-5 ${
                  editing?.id === tx.id ? "ring-2 ring-[var(--leaf)]" : ""
                }`}
                style={{ animationDelay: `${Math.min(index, 8) * 0.03}s` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--ink)]">
                      {transactionLabel(tx.type)} · {formatMoney(tx.amount, tx.currency)}
                    </p>
                    <p className="mt-1 text-sm leading-snug text-[var(--ink-soft)]">
                      {describeTx(tx)}
                      {tx.description ? ` — ${tx.description}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ink-soft)]">
                      {format(new Date(tx.occurred_on + "T12:00:00"), "d MMM yyyy")} ·{" "}
                      {tx.created_by_name}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-start">
                    <button
                      type="button"
                      onClick={() => startEdit(tx)}
                      className="text-xs font-medium text-[var(--moss)] hover:underline"
                    >
                      Edit
                    </button>
                    <DeleteTransactionButton bookId={bookId} transactionId={tx.id} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function describeTx(tx: {
  type: string;
  from_user_name?: string | null;
  to_user_name?: string | null;
  paid_by_name?: string | null;
  split_with_name?: string | null;
}) {
  switch (tx.type) {
    case "gave":
      return `${tx.from_user_name} → ${tx.to_user_name}`;
    case "received":
      return `${tx.from_user_name} received from ${tx.to_user_name}`;
    case "expense":
      return `${tx.paid_by_name} paid (split with ${tx.split_with_name})`;
    case "settlement":
      return `${tx.from_user_name} settled with ${tx.to_user_name}`;
    case "adjustment":
      return `Adjust ${tx.from_user_name} vs ${tx.to_user_name}`;
    default:
      return "";
  }
}
