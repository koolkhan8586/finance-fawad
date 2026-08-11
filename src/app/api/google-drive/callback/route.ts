import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { exchangeCodeForTokens, isGoogleDriveConfigured } from "@/lib/google-drive";

function getSecret() {
  const secret = process.env.AUTH_SECRET || "dev-only-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function GET(request: Request) {
  const base = appBaseUrl();
  const settingsUrl = `${base}/settings?google=1`;

  if (!isGoogleDriveConfigured()) {
    return NextResponse.redirect(`${settingsUrl}&error=not_configured`);
  }

  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(`${settingsUrl}&error=${encodeURIComponent(error)}`);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}&error=missing_code`);
  }

  try {
    const { payload } = await jwtVerify(state, getSecret());
    const userId = Number(payload.userId);
    if (!Number.isFinite(userId)) {
      return NextResponse.redirect(`${settingsUrl}&error=invalid_state`);
    }

    await exchangeCodeForTokens(userId, code);
    return NextResponse.redirect(`${settingsUrl}&connected=1`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "NO_REFRESH_TOKEN") {
      return NextResponse.redirect(`${settingsUrl}&error=no_refresh_token`);
    }
    console.error("Google Drive callback failed", e);
    return NextResponse.redirect(`${settingsUrl}&error=callback_failed`);
  }
}
