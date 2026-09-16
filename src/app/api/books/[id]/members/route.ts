import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  addBookMember,
  getBook,
  getBookMembers,
  getUserById,
  removeBookMember,
  setBookMemberWriteAccess,
} from "@/lib/ledger";
import { getDb } from "@/lib/db";

const patchSchema = z.object({
  userId: z.number().int().positive(),
  canWrite: z.boolean().optional(),
  action: z.enum(["add", "update", "remove"]).default("update"),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  getDb();
  try {
    await requireAdmin();
    const { id } = await context.params;
    const bookId = Number(id);
    if (!Number.isFinite(bookId)) {
      return NextResponse.json({ error: "Invalid book" }, { status: 400 });
    }
    const book = getBook(bookId);
    if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ members: getBookMembers(bookId) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
    return NextResponse.json({ error: "Failed to load members" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  getDb();
  try {
    await requireAdmin();
    const { id } = await context.params;
    const bookId = Number(id);
    if (!Number.isFinite(bookId)) {
      return NextResponse.json({ error: "Invalid book" }, { status: 400 });
    }

    const book = getBook(bookId);
    if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid member update." }, { status: 400 });
    }

    const { userId, action } = parsed.data;
    const canWrite = parsed.data.canWrite ?? true;
    const user = getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "Person not found." }, { status: 404 });
    }

    if (action === "remove") {
      try {
        const ok = removeBookMember(bookId, userId);
        if (!ok) {
          return NextResponse.json({ error: "Member not in this book." }, { status: 404 });
        }
      } catch (err) {
        if (err instanceof Error && err.message === "CANNOT_REMOVE_CREATOR") {
          return NextResponse.json(
            { error: "Cannot remove the book creator." },
            { status: 400 }
          );
        }
        throw err;
      }
    } else if (action === "add") {
      addBookMember(bookId, userId, canWrite);
    } else {
      const ok = setBookMemberWriteAccess(bookId, userId, canWrite);
      if (!ok) {
        return NextResponse.json(
          { error: "Person is not in this book. Add them first." },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ members: getBookMembers(bookId) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
    return NextResponse.json({ error: "Failed to update members" }, { status: 500 });
  }
}
