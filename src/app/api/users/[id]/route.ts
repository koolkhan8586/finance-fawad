import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  countAdmins,
  deleteUser,
  getUserById,
  updateUser,
} from "@/lib/ledger";
import { getDb } from "@/lib/db";

const updateSchema = z.object({
  username: z.string().min(2).max(40).regex(/^[a-zA-Z0-9._-]+$/).optional(),
  name: z.string().min(2).max(80).optional(),
  role: z.enum(["admin", "member"]).optional(),
  password: z.string().min(6).max(100).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  whatsappPhone: z.string().max(20).optional().or(z.literal("")).nullable(),
  whatsappApikey: z.string().max(80).optional().or(z.literal("")).nullable(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  getDb();
  try {
    const session = await requireAdmin();
    const { id } = await context.params;
    const userId = Number(id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const existing = getUserById(userId);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid user details." }, { status: 400 });
    }

    const data = parsed.data;
    if (
      existing.role === "admin" &&
      data.role === "member" &&
      countAdmins() <= 1
    ) {
      return NextResponse.json(
        { error: "Cannot demote the last admin." },
        { status: 400 }
      );
    }

    updateUser(userId, {
      username: data.username,
      name: data.name,
      role: data.role,
      password: data.password || undefined,
      email: data.email,
      whatsappPhone: data.whatsappPhone,
      whatsappApikey: data.whatsappApikey,
    });

    // If editing self and username/name changed, session cookie still has old name until re-login — fine.
    void session;
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
    if (String(e).includes("UNIQUE")) {
      return NextResponse.json({ error: "Username already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  getDb();
  try {
    const session = await requireAdmin();
    const { id } = await context.params;
    const userId = Number(id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    if (userId === session.userId) {
      return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
    }

    const existing = getUserById(userId);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.role === "admin" && countAdmins() <= 1) {
      return NextResponse.json({ error: "Cannot delete the last admin." }, { status: 400 });
    }

    try {
      deleteUser(userId);
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "HAS_HISTORY") {
        return NextResponse.json(
          {
            error:
              "This person is linked to ledger entries. Delete or edit those entries first.",
          },
          { status: 400 }
        );
      }
      if (code === "OWNS_BOOKS") {
        return NextResponse.json(
          { error: "This person created shared books. Remove those books first." },
          { status: 400 }
        );
      }
      throw err;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
