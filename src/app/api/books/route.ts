import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, requireSession } from "@/lib/auth";
import {
  computeBalances,
  createBook,
  getBookMembers,
  listBooksForUser,
} from "@/lib/ledger";
import { getDb } from "@/lib/db";

export async function GET() {
  getDb();
  try {
    const session = await requireSession();
    const books = listBooksForUser(session.userId, session.role === "admin");
    const enriched = books.map((book) => {
      const members = getBookMembers(book.id);
      const balances = computeBalances(book.id);
      const mine = balances.find((b) => b.user_id === session.userId)?.balance ?? 0;
      return {
        ...book,
        members,
        myBalance: mine,
      };
    });
    return NextResponse.json({ books: enriched });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to load books" }, { status: 500 });
  }
}

const createSchema = z.object({
  title: z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  memberIds: z.array(z.number().int().positive()).min(1),
});

export async function POST(request: Request) {
  getDb();
  try {
    const session = await requireAdmin();
    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Title and at least one member are required." }, { status: 400 });
    }
    const id = createBook({
      title: parsed.data.title,
      description: parsed.data.description,
      createdBy: session.userId,
      memberIds: parsed.data.memberIds,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
    return NextResponse.json({ error: "Failed to create book" }, { status: 500 });
  }
}
