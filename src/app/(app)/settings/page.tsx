import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { GoogleDriveSettings } from "@/components/GoogleDriveSettings";
import { NotificationSettings } from "@/components/NotificationSettings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  getDb();
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <main>
      <div className="fade-up">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--moss)]">
          Account
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
          Settings
        </h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--ink-soft)] sm:text-base">
          Check WhatsApp and email alert status, and connect Google Drive for receipts.
        </p>
      </div>

      <div className="fade-up-delay mt-6 space-y-4 sm:mt-8 sm:space-y-5">
        <NotificationSettings />
        <Suspense
          fallback={
            <div className="surface rounded-2xl p-5 text-sm text-[var(--ink-soft)]">
              Loading Google Drive…
            </div>
          }
        >
          <GoogleDriveSettings />
        </Suspense>
      </div>
    </main>
  );
}
