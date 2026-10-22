import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  addBudgetLine,
  deleteBudgetLine,
  updateBudgetLine,
  userCanAccessEvent,
} from "@/lib/events";

const createSchema = z.object({
  category: z.string().min(1).max(80),
  plannedAmount: z.number().min(0).optional(),
  actualAmount: z.number().min(0).optional(),
  notes: z.string().max(300).optional(),
});

export async function POST(
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
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Category is required." }, { status: 400 });
    }
    const lineId = addBudgetLine({
      eventId,
      category: parsed.data.category,
      plannedAmount: parsed.data.plannedAmount,
      actualAmount: parsed.data.actualAmount,
      notes: parsed.data.notes,
    });
    return NextResponse.json({ id: lineId }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to add line" }, { status: 500 });
  }
}

const updateSchema = createSchema.extend({
  lineId: z.number().int().positive(),
  notes: z.string().max(300).optional().nullable(),
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
      return NextResponse.json({ error: "Invalid line." }, { status: 400 });
    }
    const ok = updateBudgetLine(parsed.data.lineId, eventId, {
      category: parsed.data.category,
      plannedAmount: parsed.data.plannedAmount,
      actualAmount: parsed.data.actualAmount,
      notes: parsed.data.notes,
    });
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to update line" }, { status: 500 });
  }
}

const deleteSchema = z.object({
  lineId: z.number().int().positive(),
});

export async function DELETE(
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
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Line id required." }, { status: 400 });
    }
    deleteBudgetLine(parsed.data.lineId, eventId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to delete line" }, { status: 500 });
  }
}
