import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  deleteEvent,
  getEvent,
  listBudgetLines,
  updateEvent,
  userCanAccessEvent,
} from "@/lib/events";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  getDb();
  try {
    const session = await requireSession();
    const { id } = await context.params;
    const eventId = Number(id);
    if (!Number.isFinite(eventId)) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }
    if (!userCanAccessEvent(session.userId, session.role, eventId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const event = getEvent(eventId);
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const lines = listBudgetLines(eventId);
    return NextResponse.json({ event, lines });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to load event" }, { status: 500 });
  }
}

const updateSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  description: z.string().max(400).optional().nullable(),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  getDb();
  try {
    const session = await requireSession();
    const { id } = await context.params;
    const eventId = Number(id);
    if (!userCanAccessEvent(session.userId, session.role, eventId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid details." }, { status: 400 });
    }
    const ok = updateEvent(eventId, parsed.data);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  getDb();
  try {
    const session = await requireSession();
    const { id } = await context.params;
    const eventId = Number(id);
    if (!userCanAccessEvent(session.userId, session.role, eventId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    deleteEvent(eventId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
