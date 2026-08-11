import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { disconnectDrive } from "@/lib/google-drive";

export async function POST() {
  try {
    const session = await requireSession();
    disconnectDrive(session.userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
