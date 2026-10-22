import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createEvent, listEventsForUser } from "@/lib/events";

export async function GET() {
  getDb();
  try {
    const session = await requireSession();
    const events = listEventsForUser(session.userId, session.role === "admin");
    return NextResponse.json({ events });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to load events" }, { status: 500 });
  }
}

const createSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(400).optional(),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

export async function POST(request: Request) {
  getDb();
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }
    const id = createEvent({
      title: parsed.data.title,
      description: parsed.data.description,
      eventDate: parsed.data.eventDate,
      createdBy: session.userId,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
