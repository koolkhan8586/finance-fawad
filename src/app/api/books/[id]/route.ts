import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  computeBalances,
  getBook,
  getBookMembers,
  listTransactions,
  userCanAccessBook,
} from "@/lib/ledger";
import { getDb } from "@/lib/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  getDb();
  try {
    const session = await requireSession();
    const { id } = await context.params;
    const bookId = Number(id);
    if (!Number.isFinite(bookId)) {
      return NextResponse.json({ error: "Invalid book" }, { status: 400 });
    }

    if (!userCanAccessBook(session.userId, session.role, bookId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const book = getBook(bookId);
    if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const members = getBookMembers(bookId);
    const transactions = listTransactions(bookId);
    const balances = computeBalances(bookId);

    return NextResponse.json({ book, members, transactions, balances });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to load book" }, { status: 500 });
  }
}
