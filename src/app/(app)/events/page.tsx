import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listEventsForUser } from "@/lib/events";
import { formatMoney } from "@/lib/format";
import { CreateEventForm } from "@/components/CreateEventForm";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  getDb();
  const session = await getSession();
  if (!session) redirect("/login");

  const events = listEventsForUser(session.userId, session.role === "admin");

  return (
    <main>
      <div className="fade-up">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--moss)] sm:text-sm">
          Planning
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)] sm:text-4xl">
          Event budgets
        </h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--ink-soft)] sm:text-base">
          Plan a party, wedding, trip, or dinner — set a budget, then track what you actually spend.
        </p>
      </div>

      <div className="fade-up-delay mt-6 sm:mt-8">
        <CreateEventForm />
      </div>

      <section className="fade-up-delay-2 mt-6 space-y-3 sm:mt-10">
        {events.length === 0 ? (
          <p className="surface rounded-2xl px-4 py-8 text-sm text-[var(--ink-soft)] sm:px-5 sm:text-base">
            No events yet. Create one to start planning a budget.
          </p>
        ) : (
          events.map((event) => {
            const planned = Number(event.planned_total || 0);
            const actual = Number(event.actual_total || 0);
            const under = planned - actual;
            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="surface block rounded-2xl px-4 py-4 transition hover:bg-white/90 sm:px-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--ink)]">{event.title}</p>
                    {event.description ? (
                      <p className="mt-0.5 truncate text-sm text-[var(--ink-soft)]">
                        {event.description}
                      </p>
                    ) : null}
                    {event.event_date ? (
                      <p className="mt-1 text-xs text-[var(--ink-soft)]">
                        {format(new Date(event.event_date + "T12:00:00"), "d MMM yyyy")}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <p className="text-[var(--ink-soft)]">
                      Plan{" "}
                      <strong className="text-[var(--ink)]">{formatMoney(planned)}</strong>
                    </p>
                    <p className="mt-0.5 text-[var(--debit)]">
                      Spent <strong>{formatMoney(actual)}</strong>
                    </p>
                    {planned > 0 ? (
                      <p
                        className={`mt-0.5 text-xs font-medium ${
                          under >= 0 ? "text-[var(--credit)]" : "text-[var(--debit)]"
                        }`}
                      >
                        {under >= 0 ? "Under" : "Over"} {formatMoney(Math.abs(under))}
                      </p>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </section>
    </main>
  );
}
