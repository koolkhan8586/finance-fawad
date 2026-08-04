import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listUsers } from "@/lib/ledger";
import { CreateUserForm } from "@/components/CreateUserForm";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  getDb();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/dashboard");

  const users = listUsers();

  return (
    <main>
      <div className="fade-up">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--moss)]">
          Admin
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">People</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--ink-soft)] sm:text-base">
          Create logins for your brother and friends. Each person only sees books you share with them.
        </p>
      </div>

      <div className="fade-up-delay mt-6 sm:mt-8">
        <CreateUserForm />
      </div>

      <ul className="fade-up-delay-2 mt-6 space-y-2 sm:mt-8">
        {users.map((user, index) => (
          <li
            key={user.id}
            className="row-enter surface flex items-center justify-between gap-3 rounded-2xl px-4 py-4 sm:px-5"
            style={{ animationDelay: `${index * 0.04}s` }}
          >
            <div>
              <p className="font-semibold text-[var(--ink)]">{user.name}</p>
              <p className="text-sm text-[var(--ink-soft)]">@{user.username}</p>
            </div>
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--moss)]">
              {user.role}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
