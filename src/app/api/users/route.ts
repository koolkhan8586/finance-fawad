import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, requireSession } from "@/lib/auth";
import { createUser, listUsers } from "@/lib/ledger";
import { getDb } from "@/lib/db";

export async function GET() {
  getDb();
  try {
    const session = await requireSession();
    const users = listUsers();
    if (session.role !== "admin") {
      return NextResponse.json({
        users: users.map((u) => ({ id: u.id, name: u.name, username: u.username, role: u.role })),
      });
    }
    return NextResponse.json({ users });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

const createSchema = z.object({
  username: z.string().min(2).max(40).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(6).max(100),
  name: z.string().min(2).max(80),
  role: z.enum(["admin", "member"]).optional(),
});

export async function POST(request: Request) {
  getDb();
  try {
    await requireAdmin();
    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid user details." }, { status: 400 });
    }
    const id = createUser(parsed.data);
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
    if (String(e).includes("UNIQUE")) {
      return NextResponse.json({ error: "Username already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
