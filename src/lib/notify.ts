import nodemailer from "nodemailer";
import { formatMoney, transactionLabel } from "@/lib/format";
import { getBook, getBookMembers, getUserById } from "@/lib/ledger";
import type { Transaction } from "@/lib/types";

type NotifyAction = "added" | "updated" | "deleted";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://loan.khanmusa.com").replace(/\/$/, "");
}

/** Digits only, international format without +. */
function phoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

function normalizePhone(phone: string) {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }
  return trimmed.replace(/\D/g, "");
}

function buildMessage(input: {
  actorName: string;
  action: NotifyAction;
  bookTitle: string;
  bookId: number;
  type?: string;
  amount?: number;
  currency?: string;
  note?: string | null;
}) {
  const verb =
    input.action === "added" ? "added" : input.action === "updated" ? "updated" : "deleted";
  const detail =
    input.type && input.amount != null
      ? `${transactionLabel(input.type)} ${formatMoney(input.amount, input.currency || "PKR")}`
      : "an entry";
  const note = input.note ? ` — ${input.note}` : "";
  return [
    `Loan: ${input.actorName} ${verb} ${detail} in "${input.bookTitle}"${note}`,
    `${appUrl()}/books/${input.bookId}`,
  ].join("\n");
}

/**
 * WAHA self-hosted WhatsApp HTTP API
 * POST {WAHA_URL}/api/sendText
 * chatId format: 923001234567@c.us
 */
async function sendWaha(phone: string, text: string) {
  const base = process.env.WAHA_URL?.trim().replace(/\/$/, "");
  if (!base) throw new Error("WAHA_URL not set");

  const session = process.env.WAHA_SESSION?.trim() || "default";
  const apiKey = process.env.WAHA_API_KEY?.trim();
  const chatId = `${phoneDigits(phone)}@c.us`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (apiKey) headers["X-Api-Key"] = apiKey;

  const res = await fetch(`${base}/api/sendText`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      session,
      chatId,
      text,
    }),
  });

  const body = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`WAHA failed (${res.status}): ${body.slice(0, 240)}`);
  }
}

/** TextMeBot paid/low-cost gateway */
async function sendTextMeBot(phone: string, text: string) {
  const apikey = process.env.TEXTMEBOT_APIKEY?.trim();
  if (!apikey) throw new Error("TEXTMEBOT_APIKEY not set");

  const url = new URL("https://api.textmebot.com/send.php");
  url.searchParams.set("recipient", normalizePhone(phone));
  url.searchParams.set("apikey", apikey);
  url.searchParams.set("text", text);

  const res = await fetch(url.toString(), { method: "GET" });
  const body = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`TextMeBot failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const lower = body.toLowerCase();
  if (lower.includes("error") || lower.includes("invalid") || lower.includes("not linked")) {
    throw new Error(`TextMeBot: ${body.slice(0, 200)}`);
  }
}

/** Legacy CallMeBot (per-user API key) */
async function sendCallMeBot(phone: string, apikey: string, text: string) {
  const url = new URL("https://api.callmebot.com/whatsapp.php");
  url.searchParams.set("phone", normalizePhone(phone));
  url.searchParams.set("text", text);
  url.searchParams.set("apikey", apikey);
  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    throw new Error(`CallMeBot failed (${res.status})`);
  }
}

async function sendEmail(to: string, subject: string, text: string) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error("SMTP not configured");
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || user,
    to,
    subject,
    text,
  });
}

async function notifyPerson(
  person: {
    name: string;
    email?: string | null;
    whatsapp_phone?: string | null;
    whatsapp_apikey?: string | null;
  },
  text: string,
  subject: string
) {
  const phone = person.whatsapp_phone?.trim();
  const wahaUrl = process.env.WAHA_URL?.trim();
  const textMeKey = process.env.TEXTMEBOT_APIKEY?.trim();

  // Preference: WAHA → TextMeBot → CallMeBot → email
  if (phone && wahaUrl) {
    try {
      await sendWaha(phone, text);
      return "whatsapp";
    } catch (err) {
      console.error("WAHA notify failed for", person.name, err);
    }
  }

  if (phone && textMeKey) {
    try {
      await sendTextMeBot(phone, text);
      return "whatsapp";
    } catch (err) {
      console.error("TextMeBot notify failed for", person.name, err);
    }
  }

  if (phone && person.whatsapp_apikey?.trim()) {
    try {
      await sendCallMeBot(phone, person.whatsapp_apikey.trim(), text);
      return "whatsapp";
    } catch (err) {
      console.error("CallMeBot notify failed for", person.name, err);
    }
  }

  if (person.email?.trim()) {
    try {
      await sendEmail(person.email.trim(), subject, text);
      return "email";
    } catch (err) {
      console.error("Email notify failed for", person.name, err);
    }
  }

  return null;
}

export async function notifyBookMembers(input: {
  bookId: number;
  actorUserId: number;
  action: NotifyAction;
  transaction?: Pick<Transaction, "type" | "amount" | "currency" | "description">;
}) {
  try {
    const book = getBook(input.bookId);
    if (!book) return;

    const actor = getUserById(input.actorUserId);
    const members = getBookMembers(input.bookId);
    const text = buildMessage({
      actorName: actor?.name || "Someone",
      action: input.action,
      bookTitle: book.title,
      bookId: input.bookId,
      type: input.transaction?.type,
      amount: input.transaction?.amount,
      currency: input.transaction?.currency,
      note: input.transaction?.description,
    });
    const subject = `Loan update: ${book.title}`;

    await Promise.all(
      members
        .filter((m) => m.user_id !== input.actorUserId)
        .map((m) =>
          notifyPerson(
            {
              name: m.name,
              email: m.email,
              whatsapp_phone: m.whatsapp_phone,
              whatsapp_apikey: m.whatsapp_apikey,
            },
            text,
            subject
          )
        )
    );
  } catch (err) {
    console.error("notifyBookMembers failed", err);
  }
}

export function whatsappProviderStatus() {
  if (process.env.WAHA_URL?.trim()) return "waha";
  if (process.env.TEXTMEBOT_APIKEY?.trim()) return "textmebot";
  return "none";
}

export type WahaHealth = {
  configured: boolean;
  url: string | null;
  session: string | null;
  reachable: boolean;
  connected: boolean;
  status: string | null;
  phone: string | null;
  error: string | null;
};

export type EmailHealth = {
  configured: boolean;
  host: string | null;
  port: number | null;
  user: string | null;
  from: string | null;
  connected: boolean;
  error: string | null;
};

export type TextMeBotHealth = {
  configured: boolean;
};

export async function checkWahaHealth(): Promise<WahaHealth> {
  const base = process.env.WAHA_URL?.trim().replace(/\/$/, "") || null;
  const session = process.env.WAHA_SESSION?.trim() || "default";
  const apiKey = process.env.WAHA_API_KEY?.trim();

  if (!base) {
    return {
      configured: false,
      url: null,
      session: null,
      reachable: false,
      connected: false,
      status: null,
      phone: null,
      error: null,
    };
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers["X-Api-Key"] = apiKey;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${base}/api/sessions/${encodeURIComponent(session)}`, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    clearTimeout(timer);

    const body = await res.text().catch(() => "");
    if (!res.ok) {
      return {
        configured: true,
        url: base,
        session,
        reachable: true,
        connected: false,
        status: null,
        phone: null,
        error: `WAHA responded ${res.status}${body ? `: ${body.slice(0, 120)}` : ""}`,
      };
    }

    let data: { status?: string; me?: { id?: string; pushName?: string } } = {};
    try {
      data = JSON.parse(body);
    } catch {
      // ignore
    }

    const status = data.status || null;
    const phone = data.me?.id?.replace(/@c\.us$/i, "") || null;

    return {
      configured: true,
      url: base,
      session,
      reachable: true,
      connected: status === "WORKING",
      status,
      phone,
      error: status && status !== "WORKING" ? `Session status is ${status}` : null,
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Timed out reaching WAHA"
          : err.message
        : "Could not reach WAHA";
    return {
      configured: true,
      url: base,
      session,
      reachable: false,
      connected: false,
      status: null,
      phone: null,
      error: message,
    };
  }
}

export async function checkEmailHealth(): Promise<EmailHealth> {
  const host = process.env.SMTP_HOST?.trim() || null;
  const user = process.env.SMTP_USER?.trim() || null;
  const pass = process.env.SMTP_PASS?.trim() || null;
  const port = Number(process.env.SMTP_PORT || 587);
  const from = process.env.SMTP_FROM?.trim() || user;

  if (!host || !user || !pass) {
    return {
      configured: false,
      host,
      port: host ? port : null,
      user,
      from,
      connected: false,
      error: null,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    });

    await transporter.verify();
    return {
      configured: true,
      host,
      port,
      user,
      from,
      connected: true,
      error: null,
    };
  } catch (err) {
    return {
      configured: true,
      host,
      port,
      user,
      from,
      connected: false,
      error: err instanceof Error ? err.message.slice(0, 160) : "SMTP verify failed",
    };
  }
}

export function checkTextMeBotHealth(): TextMeBotHealth {
  return { configured: Boolean(process.env.TEXTMEBOT_APIKEY?.trim()) };
}
