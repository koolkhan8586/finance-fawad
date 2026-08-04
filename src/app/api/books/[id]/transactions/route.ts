import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { addTransaction, deleteTransaction, userCanAccessBook } from "@/lib/ledger";
import { getDb } from "@/lib/db";

const createSchema = z.object({
  type: z.enum(["gave", "received", "expense", "settlement", "adjustment"]),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3).optional(),
  description: z.string().max(400).optional(),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fromUserId: z.number().int().positive().nullable().optional(),
  toUserId: z.number().int().positive().nullable().optional(),
  paidByUserId: z.number().int().positive().nullable().optional(),
  splitWithUserId: z.number().int().positive().nullable().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  getDb();
  try {
    const session = await requireSession();
    const { id } = await context.params;
    const bookId = Number(id);
    if (!userCanAccessBook(session.userId, session.role, bookId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid transaction." }, { status: 400 });
    }

    const data = parsed.data;
    if (data.type === "expense") {
      if (!data.paidByUserId || !data.splitWithUserId) {
        return NextResponse.json(
          { error: "Shared expense needs who paid and who shares." },
          { status: 400 }
        );
      }
    } else if (!data.fromUserId || !data.toUserId) {
      return NextResponse.json(
        { error: "From and to people are required." },
        { status: 400 }
      );
    }

    const txId = addTransaction({
      bookId,
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      occurredOn: data.occurredOn,
      createdBy: session.userId,
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      paidByUserId: data.paidByUserId,
      splitWithUserId: data.splitWithUserId,
    });

    return NextResponse.json({ id: txId }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to add transaction" }, { status: 500 });
  }
}

const deleteSchema = z.object({
  transactionId: z.number().int().positive(),
});

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  getDb();
  try {
    const session = await requireSession();
    const { id } = await context.params;
    const bookId = Number(id);
    if (!userCanAccessBook(session.userId, session.role, bookId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Transaction id required." }, { status: 400 });
    }

    deleteTransaction(parsed.data.transactionId, bookId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
