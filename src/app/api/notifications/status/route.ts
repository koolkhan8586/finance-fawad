import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  checkEmailHealth,
  checkTextMeBotHealth,
  checkWahaHealth,
  whatsappProviderStatus,
} from "@/lib/notify";

export async function GET() {
  try {
    await requireSession();

    const [waha, email] = await Promise.all([checkWahaHealth(), checkEmailHealth()]);
    const textmebot = checkTextMeBotHealth();

    return NextResponse.json({
      provider: whatsappProviderStatus(),
      waha,
      textmebot,
      email,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to check notification status" }, { status: 500 });
  }
}
