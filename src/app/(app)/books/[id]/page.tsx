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
import { BookActivity } from "@/components/BookActivity";
import { BalanceHero } from "@/components/BalanceHero";
import type { EditableTransaction } from "@/components/AddTransactionForm";

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

  const txRows = transactions.map((tx) => ({
    id: tx.id,
    type: tx.type as EditableTransaction["type"],
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
    created_by_name: tx.created_by_name,
    from_user_name: tx.from_user_name,
    to_user_name: tx.to_user_name,
    paid_by_name: tx.paid_by_name,
    split_with_name: tx.split_with_name,
  }));

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

      <div className="fade-up mt-5 sm:mt-8">
        <BalanceHero
          myBalance={myBalance}
          otherName={other?.name}
          memberBalances={balances}
        />
      </div>

      <BookActivity
        bookId={bookId}
        members={members.map((m) => ({ id: m.user_id, name: m.name }))}
        currentUserId={session.userId}
        transactions={txRows}
      />
    </main>
  );
}
