import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  computeBalances,
  getBook,
  getBookMembers,
  listTransactions,
  userCanAccessBook,
} from "@/lib/ledger";
import { formatMoney, transactionLabel } from "@/lib/format";
import { AddTransactionForm } from "@/components/AddTransactionForm";
import { DeleteTransactionButton } from "@/components/DeleteTransactionButton";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  getDb();
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const bookId = Number(id);
  if (!Number.isFinite(bookId)) notFound();
  if (!userCanAccessBook(session.userId, session.role, bookId)) redirect("/dashboard");

  const book = getBook(bookId);
  if (!book) notFound();

  const members = getBookMembers(bookId);
  const balances = computeBalances(bookId);
  const transactions = listTransactions(bookId);
  const myBalance = balances.find((b) => b.user_id === session.userId)?.balance ?? 0;
  const other = members.find((m) => m.user_id !== session.userId);

  return (
    <main>
      <Link href="/dashboard" className="text-sm text-[var(--moss)] hover:underline">
        ← All books
      </Link>

      <div className="fade-up mt-3 sm:mt-4">
        <h1 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--ink)] sm:text-4xl">
          {book.title}
        </h1>
        {book.description ? (
          <p className="mt-2 text-sm text-[var(--ink-soft)] sm:text-base">{book.description}</p>
        ) : null}
      </div>

      <section className="balance-pulse surface mt-5 rounded-2xl p-4 sm:mt-8 sm:p-6">
        <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)] sm:text-sm">
          Your position
        </p>
        <p
          className={`mt-2 font-[family-name:var(--font-display)] text-3xl leading-tight sm:text-4xl ${
            myBalance > 0
              ? "text-[var(--moss)]"
              : myBalance < 0
                ? "text-[var(--gold)]"
                : "text-[var(--ink-soft)]"
          }`}
        >
          {myBalance === 0
            ? "All settled"
            : myBalance > 0
              ? `${formatMoney(myBalance)} owed to you`
              : `You owe ${formatMoney(Math.abs(myBalance))}`}
        </p>
        {other && myBalance !== 0 ? (
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            with {other.name}
          </p>
        ) : null}
        <ul className="mt-4 grid gap-2 text-sm text-[var(--ink-soft)] sm:mt-5 sm:flex sm:flex-wrap sm:gap-4">
          {balances.map((b) => (
            <li
              key={b.user_id}
              className="flex items-center justify-between rounded-xl bg-white/50 px-3 py-2 sm:bg-transparent sm:p-0"
            >
              <span className="font-medium text-[var(--ink)]">{b.name}</span>
              <span className="sm:ml-1">
                {b.balance === 0
                  ? "even"
                  : b.balance > 0
                    ? `+${formatMoney(b.balance)}`
                    : `−${formatMoney(Math.abs(b.balance))}`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="fade-up-delay mt-5 sm:mt-8">
        <AddTransactionForm
          bookId={bookId}
          members={members.map((m) => ({ id: m.user_id, name: m.name }))}
          currentUserId={session.userId}
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
                className="row-enter surface rounded-2xl px-4 py-4 sm:px-5"
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
                  <DeleteTransactionButton bookId={bookId} transactionId={tx.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
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
