import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { computeBalances, getBookMembers, listBooksForUser } from "@/lib/ledger";
import { formatMoney } from "@/lib/format";
import { CreateBookForm } from "@/components/CreateBookForm";
import { listUsers } from "@/lib/ledger";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  getDb();
  const session = await getSession();
  if (!session) redirect("/login");

  const books = listBooksForUser(session.userId, session.role === "admin");
  const users = session.role === "admin" ? listUsers().filter((u) => u.id !== session.userId) : [];

  const cards = books.map((book) => {
    const members = getBookMembers(book.id);
    const balances = computeBalances(book.id);
    const mine = balances.find((b) => b.user_id === session.userId)?.balance ?? 0;
    const others = members.filter((m) => m.user_id !== session.userId).map((m) => m.name);
    return { book, members, mine, others };
  });

  return (
    <main>
      <div className="fade-up">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--moss)]">
          Your books
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--ink)]">
          Hello, {session.name.split(" ")[0]}
        </h1>
        <p className="mt-2 max-w-xl text-[var(--ink-soft)]">
          Open a shared book to record money given, received, or spent together.
        </p>
      </div>

      {session.role === "admin" ? (
        <div className="fade-up-delay mt-8">
          <CreateBookForm members={users.map((u) => ({ id: u.id, name: u.name }))} />
        </div>
      ) : null}

      <section className="fade-up-delay-2 mt-10 space-y-3">
        {cards.length === 0 ? (
          <p className="surface rounded-2xl px-5 py-8 text-[var(--ink-soft)]">
            No shared books yet.
            {session.role === "admin"
              ? " Create logins for your brother and friends, then open a book with them."
              : " Ask Ammad to add you to a book."}
          </p>
        ) : (
          cards.map(({ book, mine, others }, index) => (
            <Link
              key={book.id}
              href={`/books/${book.id}`}
              className="row-enter surface block rounded-2xl px-5 py-5 transition hover:bg-white/80"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
                    {book.title}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    with {others.length ? others.join(", ") : "you"}
                    {book.description ? ` · ${book.description}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">
                    {mine > 0 ? "They owe you" : mine < 0 ? "You owe" : "Settled"}
                  </p>
                  <p
                    className={`mt-1 text-xl font-semibold ${
                      mine > 0
                        ? "text-[var(--moss)]"
                        : mine < 0
                          ? "text-[var(--gold)]"
                          : "text-[var(--ink-soft)]"
                    }`}
                  >
                    {formatMoney(Math.abs(mine))}
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
