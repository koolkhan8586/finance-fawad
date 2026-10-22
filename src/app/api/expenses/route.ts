import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  PERSONAL_CATEGORIES,
  addPersonalExpense,
  deletePersonalExpense,
  listPersonalExpenses,
  summarizePersonalExpenses,
  updatePersonalExpense,
} from "@/lib/personal-expenses";

export async function GET() {
  getDb();
  try {
    const session = await requireSession();
    const expenses = listPersonalExpenses(session.userId);
    const summary = summarizePersonalExpenses(session.userId);
    return NextResponse.json({
      expenses,
      summary,
      categories: PERSONAL_CATEGORIES,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to load expenses" }, { status: 500 });
  }
}

const createSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().min(3).max(3).optional(),
  category: z.string().min(1).max(60),
  description: z.string().max(300).optional(),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: Request) {
  getDb();
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid expense." }, { status: 400 });
    }
    const id = addPersonalExpense({
      userId: session.userId,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      category: parsed.data.category,
      description: parsed.data.description,
      occurredOn: parsed.data.occurredOn,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to add expense" }, { status: 500 });
  }
}

const updateSchema = createSchema.extend({
  id: z.number().int().positive(),
  description: z.string().max(300).optional().nullable(),
});

export async function PATCH(request: Request) {
  getDb();
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid expense." }, { status: 400 });
    }
    const ok = updatePersonalExpense(parsed.data.id, session.userId, {
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      category: parsed.data.category,
      description: parsed.data.description,
      occurredOn: parsed.data.occurredOn,
    });
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

const deleteSchema = z.object({
  id: z.number().int().positive(),
});

export async function DELETE(request: Request) {
  getDb();
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => null);
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Expense id required." }, { status: 400 });
    }
    deletePersonalExpense(parsed.data.id, session.userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
