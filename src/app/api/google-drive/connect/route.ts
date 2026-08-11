import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { requireSession } from "@/lib/auth";
import { getGoogleAuthUrl, isGoogleDriveConfigured } from "@/lib/google-drive";

function getSecret() {
  const secret = process.env.AUTH_SECRET || "dev-only-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

export async function GET() {
  try {
    if (!isGoogleDriveConfigured()) {
      return NextResponse.json(
        { error: "Google Drive is not configured on the server." },
        { status: 503 }
      );
    }

    const session = await requireSession();
    const state = await new SignJWT({ userId: session.userId })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(getSecret());

    const url = getGoogleAuthUrl(state);
    return NextResponse.redirect(url);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Could not start Google sign-in." }, { status: 500 });
  }
}
