import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import type { SessionPayload, User } from "./types";

const COOKIE_NAME = "musa_session";

function getSecret() {
  const secret = process.env.AUTH_SECRET || "dev-only-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: Number(payload.userId),
      username: String(payload.username),
      name: String(payload.name),
      role: payload.role as SessionPayload["role"],
    };
  } catch {
    return null;
  }
}

export function authenticateUser(username: string, password: string): User | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, username, name, role, email, whatsapp_phone, whatsapp_apikey, created_at, password_hash
       FROM users WHERE username = ? COLLATE NOCASE`
    )
    .get(username.trim()) as
    | (User & { password_hash: string })
    | undefined;

  if (!row) return null;
  if (!bcrypt.compareSync(password, row.password_hash)) return null;

  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    email: row.email,
    whatsapp_phone: row.whatsapp_phone,
    whatsapp_apikey: row.whatsapp_apikey,
    created_at: row.created_at,
  };
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.role !== "admin") throw new Error("FORBIDDEN");
  return session;
}
