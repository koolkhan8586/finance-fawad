import nodemailer from "nodemailer";
import { formatMoney, transactionLabel } from "@/lib/format";
import { getBook, getBookMembers, getUserById } from "@/lib/ledger";
import type { Transaction } from "@/lib/types";

type NotifyAction = "added" | "updated" | "deleted";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://loan.khanmusa.com").replace(/\/$/, "");
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

async function sendWhatsApp(phone: string, apikey: string, text: string) {
  const url = new URL("https://api.callmebot.com/whatsapp.php");
  url.searchParams.set("phone", phone.replace(/[^\d+]/g, ""));
  url.searchParams.set("text", text);
  url.searchParams.set("apikey", apikey);
  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    throw new Error(`WhatsApp failed (${res.status})`);
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
  const key = person.whatsapp_apikey?.trim();
  if (phone && key) {
    try {
      await sendWhatsApp(phone, key, text);
      return "whatsapp";
    } catch (err) {
      console.error("WhatsApp notify failed for", person.name, err);
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
