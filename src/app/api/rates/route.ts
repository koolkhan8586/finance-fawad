import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { BASE_CURRENCY, isSupportedCurrency } from "@/lib/currency";

/**
 * Suggest today's market rate into PKR.
 * User can still edit the rate before saving (cash-shop rates often differ).
 */
export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const from = (searchParams.get("from") || "").toUpperCase();

    if (!from || !isSupportedCurrency(from)) {
      return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
    }
    if (from === BASE_CURRENCY) {
      return NextResponse.json({ from, to: BASE_CURRENCY, rate: 1 });
    }

    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Could not fetch rate" }, { status: 502 });
    }
    const data = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };
    const rate = data.rates?.[BASE_CURRENCY];
    if (!rate || !Number.isFinite(rate)) {
      return NextResponse.json({ error: "PKR rate unavailable" }, { status: 502 });
    }

    return NextResponse.json({
      from,
      to: BASE_CURRENCY,
      rate: Math.round(rate * 10000) / 10000,
      source: "open.er-api.com",
      note: "Suggested market rate — edit if your cash rate differs.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to fetch rate" }, { status: 500 });
  }
}
