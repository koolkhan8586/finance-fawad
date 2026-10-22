import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { AppHeader } from "@/components/AppHeader";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  getDb();
  const session = await getSession();
  if (!session) redirect("/login");

  const links = [
    { href: "/dashboard", label: "Books" },
    { href: "/events", label: "Events" },
    { href: "/expenses", label: "Expenses" },
    ...(session.role === "admin" ? [{ href: "/people", label: "People" }] : []),
    { href: "/settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen pb-[env(safe-area-inset-bottom)]">
      <AppHeader name={session.name} links={links} />
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 sm:py-8">{children}</div>
    </div>
  );
}
