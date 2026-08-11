import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import {
  addTransaction,
  deleteTransaction,
  getAttachmentsForDriveCleanup,
  listTransactions,
  updateTransaction,
  userCanAccessBook,
} from "@/lib/ledger";
import { getDb } from "@/lib/db";
import { notifyBookMembers } from "@/lib/notify";
import { deleteDriveFile } from "@/lib/google-drive";
import { BASE_CURRENCY, isSupportedCurrency, toPkr } from "@/lib/currency";

const createSchema = z.object({
  type: z.enum(["gave", "received", "expense", "settlement", "adjustment"]),
  /** Amount in the selected currency */
  amount: z.number().positive(),
  currency: z.string().min(3).max(3).default("PKR"),
  /** PKR per 1 unit of currency (required when currency !== PKR) */
  exchangeRate: z.number().positive().optional(),
  description: z.string().max(400).optional(),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fromUserId: z.number().int().positive().nullable().optional(),
  toUserId: z.number().int().positive().nullable().optional(),
  paidByUserId: z.number().int().positive().nullable().optional(),
  splitWithUserId: z.number().int().positive().nullable().optional(),
});

function validateParties(data: z.infer<typeof createSchema>) {
  if (data.type === "expense") {
    if (!data.paidByUserId || !data.splitWithUserId) {
      return "Shared expense needs who paid and who shares.";
    }
  } else if (!data.fromUserId || !data.toUserId) {
    return "From and to people are required.";
  }
  return null;
}

function resolveMoney(data: z.infer<typeof createSchema>) {
  const currency = (data.currency || BASE_CURRENCY).toUpperCase();
  if (!isSupportedCurrency(currency)) {
    throw new Error("UNSUPPORTED_CURRENCY");
  }
  const exchangeRate = currency === BASE_CURRENCY ? 1 : data.exchangeRate;
  if (currency !== BASE_CURRENCY && (!exchangeRate || exchangeRate <= 0)) {
    throw new Error("RATE_REQUIRED");
  }
  const originalAmount = data.amount;
  const amountPkr = toPkr(originalAmount, currency, exchangeRate || 1);
  return { currency, exchangeRate: exchangeRate || 1, originalAmount, amountPkr };
}

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

    const partyError = validateParties(parsed.data);
    if (partyError) {
      return NextResponse.json({ error: partyError }, { status: 400 });
    }

    let money;
    try {
      money = resolveMoney(parsed.data);
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "RATE_REQUIRED") {
        return NextResponse.json(
          { error: "Enter today's exchange rate (PKR per 1 unit)." },
          { status: 400 }
        );
      }
      if (code === "UNSUPPORTED_CURRENCY") {
        return NextResponse.json({ error: "Unsupported currency." }, { status: 400 });
      }
      throw err;
    }

    const data = parsed.data;
    const txId = addTransaction({
      bookId,
      type: data.type,
      amount: money.amountPkr,
      currency: money.currency,
      originalAmount: money.originalAmount,
      exchangeRate: money.exchangeRate,
      description: data.description,
      occurredOn: data.occurredOn,
      createdBy: session.userId,
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      paidByUserId: data.paidByUserId,
      splitWithUserId: data.splitWithUserId,
    });

    void notifyBookMembers({
      bookId,
      actorUserId: session.userId,
      action: "added",
      transaction: {
        type: data.type,
        amount: money.amountPkr,
        currency: "PKR",
        description:
          money.currency === "PKR"
            ? data.description || null
            : `${money.currency} ${money.originalAmount} @ ${money.exchangeRate}${
                data.description ? ` — ${data.description}` : ""
              }`,
      },
    });

    return NextResponse.json({ id: txId, amountPkr: money.amountPkr }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to add transaction" }, { status: 500 });
  }
}

const updateSchema = createSchema.extend({
  transactionId: z.number().int().positive(),
});

export async function PATCH(
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
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid transaction." }, { status: 400 });
    }

    const partyError = validateParties(parsed.data);
    if (partyError) {
      return NextResponse.json({ error: partyError }, { status: 400 });
    }

    let money;
    try {
      money = resolveMoney(parsed.data);
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "RATE_REQUIRED") {
        return NextResponse.json(
          { error: "Enter today's exchange rate (PKR per 1 unit)." },
          { status: 400 }
        );
      }
      if (code === "UNSUPPORTED_CURRENCY") {
        return NextResponse.json({ error: "Unsupported currency." }, { status: 400 });
      }
      throw err;
    }

    const data = parsed.data;
    const ok = updateTransaction({
      id: data.transactionId,
      bookId,
      type: data.type,
      amount: money.amountPkr,
      currency: money.currency,
      originalAmount: money.originalAmount,
      exchangeRate: money.exchangeRate,
      description: data.description,
      occurredOn: data.occurredOn,
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      paidByUserId: data.paidByUserId,
      splitWithUserId: data.splitWithUserId,
    });

    if (!ok) {
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    }

    void notifyBookMembers({
      bookId,
      actorUserId: session.userId,
      action: "updated",
      transaction: {
        type: data.type,
        amount: money.amountPkr,
        currency: "PKR",
        description:
          money.currency === "PKR"
            ? data.description || null
            : `${money.currency} ${money.originalAmount} @ ${money.exchangeRate}${
                data.description ? ` — ${data.description}` : ""
              }`,
      },
    });

    return NextResponse.json({ ok: true, amountPkr: money.amountPkr });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
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

    const existing = listTransactions(bookId).find((t) => t.id === parsed.data.transactionId);
    const attachments = getAttachmentsForDriveCleanup(parsed.data.transactionId);
    deleteTransaction(parsed.data.transactionId, bookId);

    for (const att of attachments) {
      void deleteDriveFile(att.uploaded_by, att.drive_file_id);
    }

    if (existing) {
      void notifyBookMembers({
        bookId,
        actorUserId: session.userId,
        action: "deleted",
        transaction: {
          type: existing.type,
          amount: existing.amount,
          currency: "PKR",
          description: existing.description,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
