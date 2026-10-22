import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  listPersonalExpenses,
  summarizePersonalExpenses,
} from "@/lib/personal-expenses";
import { PersonalExpensesManager } from "@/components/PersonalExpensesManager";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  getDb();
  const session = await getSession();
  if (!session) redirect("/login");

  const expenses = listPersonalExpenses(session.userId);
  const summary = summarizePersonalExpenses(session.userId);

  return (
    <main>
      <div className="fade-up">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--moss)] sm:text-sm">
          Personal
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)] sm:text-4xl">
          My expenses
        </h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--ink-soft)] sm:text-base">
          Quickly log everyday spending — food, transport, bills, and more. Private to your login.
        </p>
      </div>

      <div className="fade-up-delay mt-6 sm:mt-8">
        <PersonalExpensesManager expenses={expenses} summary={summary} />
      </div>
    </main>
  );
}
