import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  getDriveConnectionEmail,
  isDriveConnected,
  isGoogleDriveConfigured,
} from "@/lib/google-drive";

export async function GET() {
  try {
    const session = await requireSession();
    const configured = isGoogleDriveConfigured();
    return NextResponse.json({
      configured,
      connected: configured && isDriveConnected(session.userId),
      email: configured ? getDriveConnectionEmail(session.userId) : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load status" }, { status: 500 });
  }
}
