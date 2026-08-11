"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  cashFlowForUser,
  flowSign,
  formatMoney,
  transactionLabel,
} from "@/lib/format";
import { formatFxLine } from "@/lib/currency";
import {
  AddTransactionForm,
  type EditableTransaction,
} from "@/components/AddTransactionForm";
import { DeleteTransactionButton } from "@/components/DeleteTransactionButton";

type Member = { id: number; name: string };

type TxRow = EditableTransaction & {
  created_by_name?: string;
  from_user_name?: string | null;
  to_user_name?: string | null;
  paid_by_name?: string | null;
  split_with_name?: string | null;
  attachments?: {
    id: number;
    filename: string;
    webViewLink: string | null;
    mimeType: string | null;
  }[];
};

export function BookActivity({
  bookId,
  members,
  currentUserId,
  transactions,
  driveConfigured,
  driveConnected,
}: {
  bookId: number;
  members: Member[];
  currentUserId: number;
  transactions: TxRow[];
  driveConfigured: boolean;
  driveConnected: boolean;
}) {
  const [editing, setEditing] = useState<EditableTransaction | null>(null);

  function startEdit(tx: TxRow) {
    setEditing({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency,
      original_amount: tx.original_amount,
      exchange_rate: tx.exchange_rate,
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
          driveConfigured={driveConfigured}
          driveConnected={driveConnected}
        />
      </div>

      <section className="fade-up-delay-2 mt-8 sm:mt-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Activity</h2>
          <p className="text-xs text-[var(--ink-soft)]">
            <span className="text-[var(--credit)]">● Green = in</span>
            {" · "}
            <span className="text-[var(--debit)]">● Red = out</span>
          </p>
        </div>
        {transactions.length === 0 ? (
          <p className="surface mt-4 rounded-2xl px-4 py-8 text-[var(--ink-soft)] sm:px-5">
            No transactions yet. Add the first one above.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {transactions.map((tx, index) => {
              const flow = cashFlowForUser(tx, currentUserId);
              const rowClass =
                flow === "in" ? "tx-in" : flow === "out" ? "tx-out" : "tx-neutral";
              const amountClass =
                flow === "in"
                  ? "text-[var(--credit)]"
                  : flow === "out"
                    ? "text-[var(--debit)]"
                    : "text-[var(--ink)]";

              return (
                <li
                  key={tx.id}
                  className={`row-enter rounded-2xl px-4 py-4 sm:px-5 ${rowClass} ${
                    editing?.id === tx.id ? "ring-2 ring-[var(--leaf)]" : ""
                  }`}
                  style={{ animationDelay: `${Math.min(index, 8) * 0.03}s` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                            flow === "in"
                              ? "bg-[var(--credit)] text-white"
                              : flow === "out"
                                ? "bg-[var(--debit)] text-white"
                                : "bg-[var(--neutral)] text-white"
                          }`}
                        >
                          {flow === "in" ? "In" : flow === "out" ? "Out" : "Note"}
                        </span>
                        <p className="font-semibold text-[var(--ink)]">
                          {transactionLabel(tx.type)}
                        </p>
                      </div>
                      <p className={`mt-1 text-lg font-bold ${amountClass}`}>
                        {flowSign(flow)}
                        {formatMoney(tx.amount, "PKR")}
                      </p>
                      {tx.currency &&
                      tx.currency !== "PKR" &&
                      tx.original_amount != null &&
                      tx.exchange_rate != null ? (
                        <p className="mt-0.5 text-xs font-medium text-[var(--ink-soft)]">
                          {formatFxLine({
                            originalAmount: tx.original_amount,
                            currency: tx.currency,
                            exchangeRate: tx.exchange_rate,
                            amountPkr: tx.amount,
                          })}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm leading-snug text-[var(--ink-soft)]">
                        {describeTx(tx)}
                        {tx.description ? ` — ${tx.description}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-[var(--ink-soft)]">
                        {format(new Date(tx.occurred_on + "T12:00:00"), "d MMM yyyy")} ·{" "}
                        {tx.created_by_name}
                      </p>
                      {tx.attachments && tx.attachments.length > 0 ? (
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {tx.attachments.map((att) => (
                            <li key={att.id}>
                              {att.webViewLink ? (
                                <a
                                  href={att.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center rounded-lg border border-[var(--line)] bg-white/80 px-2 py-1 text-xs font-medium text-[var(--moss)] hover:bg-white"
                                >
                                  📎 {att.filename}
                                </a>
                              ) : (
                                <span className="text-xs text-[var(--ink-soft)]">📎 {att.filename}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : null}
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
              );
            })}
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
