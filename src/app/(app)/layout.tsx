import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  getDb();
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen pb-[env(safe-area-inset-bottom)]">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[rgba(247,244,236,0.92)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <Link
            href="/dashboard"
            className="brand-mark font-[family-name:var(--font-display)] text-xl text-[var(--moss-deep)] sm:text-2xl"
          >
            Loan
          </Link>
          <nav className="flex max-w-[calc(100vw-7rem)] items-center gap-1 overflow-x-auto text-sm font-medium text-[var(--ink-soft)] sm:max-w-none sm:gap-3">
            <Link
              href="/dashboard"
              className="shrink-0 rounded-lg px-2 py-2 hover:bg-white/60 hover:text-[var(--ink)] sm:px-3"
            >
              Books
            </Link>
            <Link
              href="/events"
              className="shrink-0 rounded-lg px-2 py-2 hover:bg-white/60 hover:text-[var(--ink)] sm:px-3"
            >
              Events
            </Link>
            <Link
              href="/expenses"
              className="shrink-0 rounded-lg px-2 py-2 hover:bg-white/60 hover:text-[var(--ink)] sm:px-3"
            >
              Expenses
            </Link>
            {session.role === "admin" ? (
              <Link
                href="/people"
                className="shrink-0 rounded-lg px-2 py-2 hover:bg-white/60 hover:text-[var(--ink)] sm:px-3"
              >
                People
              </Link>
            ) : null}
            <Link
              href="/settings"
              className="shrink-0 rounded-lg px-2 py-2 hover:bg-white/60 hover:text-[var(--ink)] sm:px-3"
            >
              Settings
            </Link>
            <span className="hidden max-w-[9rem] shrink-0 truncate text-[var(--ink)] sm:inline">
              {session.name}
            </span>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 sm:py-8">{children}</div>
    </div>
  );
}
