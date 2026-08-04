import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listUsers } from "@/lib/ledger";
import { PeopleManager } from "@/components/PeopleManager";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  getDb();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/dashboard");

  const users = listUsers().map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    email: u.email,
    whatsapp_phone: u.whatsapp_phone,
  }));

  const textMeConfigured = Boolean(process.env.TEXTMEBOT_APIKEY?.trim());

  return (
    <main>
      <div className="fade-up">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--moss)]">
          Admin
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">People</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--ink-soft)] sm:text-base">
          Create, edit, or remove logins. Add each person’s WhatsApp number for TextMeBot alerts
          {textMeConfigured ? " (API key is set on the server)." : " — set TEXTMEBOT_APIKEY in .env first."}
        </p>
      </div>

      <div className="fade-up-delay mt-6 sm:mt-8">
        <PeopleManager people={users} currentUserId={session.userId} />
      </div>
    </main>
  );
}
