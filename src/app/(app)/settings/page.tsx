import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { GoogleDriveSettings } from "@/components/GoogleDriveSettings";

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
          Connect Google Drive to attach receipts when adding ledger entries.
        </p>
      </div>

      <div className="fade-up-delay mt-6 sm:mt-8">
        <Suspense
          fallback={
            <div className="surface rounded-2xl p-5 text-sm text-[var(--ink-soft)]">
              Loading…
            </div>
          }
        >
          <GoogleDriveSettings />
        </Suspense>
      </div>
    </main>
  );
}
