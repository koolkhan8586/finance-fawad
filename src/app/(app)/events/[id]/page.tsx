import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getEvent, listBudgetLines, userCanAccessEvent } from "@/lib/events";
import { EventBudgetManager } from "@/components/EventBudgetManager";
import { DeleteEventButton } from "@/components/DeleteEventButton";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  getDb();
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isFinite(eventId)) notFound();

  if (!userCanAccessEvent(session.userId, session.role, eventId)) {
    redirect("/events");
  }

  const event = getEvent(eventId);
  if (!event) notFound();

  const lines = listBudgetLines(eventId);

  return (
    <main>
      <div className="fade-up">
        <Link
          href="/events"
          className="text-sm font-medium text-[var(--moss)] hover:underline"
        >
          ← Events
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)] sm:text-4xl">
              {event.title}
            </h1>
            {event.description ? (
              <p className="mt-2 text-sm text-[var(--ink-soft)] sm:text-base">
                {event.description}
              </p>
            ) : null}
            {event.event_date ? (
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                {format(new Date(event.event_date + "T12:00:00"), "d MMMM yyyy")}
              </p>
            ) : null}
          </div>
          <DeleteEventButton eventId={event.id} />
        </div>
      </div>

      <div className="fade-up-delay mt-6 sm:mt-8">
        <EventBudgetManager eventId={event.id} lines={lines} />
      </div>
    </main>
  );
}
