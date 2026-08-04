import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  getDb();
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[rgba(247,244,236,0.85)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/dashboard" className="brand-mark font-[family-name:var(--font-display)] text-2xl text-[var(--moss-deep)]">
            Musa
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-[var(--ink-soft)]">
            <Link href="/dashboard" className="hover:text-[var(--ink)]">
              Books
            </Link>
            {session.role === "admin" ? (
              <Link href="/people" className="hover:text-[var(--ink)]">
                People
              </Link>
            ) : null}
            <span className="hidden text-[var(--ink)] sm:inline">{session.name}</span>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-8">{children}</div>
    </div>
  );
}
