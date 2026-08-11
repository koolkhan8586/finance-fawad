import { google } from "googleapis";
import type { drive_v3 } from "googleapis";
import { getDb } from "@/lib/db";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const LOAN_FOLDER = "Loan";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

export function isGoogleDriveConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
}

function redirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    `${(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")}/api/google-drive/callback`
  );
}

export function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_NOT_CONFIGURED");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri());
}

export function getGoogleAuthUrl(state: string) {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

type StoredTokens = {
  user_id: number;
  refresh_token: string;
  access_token: string | null;
  expires_at: number | null;
  google_email: string | null;
};

function getStoredTokens(userId: number): StoredTokens | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT user_id, refresh_token, access_token, expires_at, google_email
       FROM google_drive_tokens WHERE user_id = ?`
    )
    .get(userId) as StoredTokens | undefined;
  return row ?? null;
}

export function isDriveConnected(userId: number) {
  return Boolean(getStoredTokens(userId)?.refresh_token);
}

export function getDriveConnectionEmail(userId: number) {
  return getStoredTokens(userId)?.google_email ?? null;
}

export async function exchangeCodeForTokens(userId: number, code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token && !getStoredTokens(userId)?.refresh_token) {
    throw new Error("NO_REFRESH_TOKEN");
  }

  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  let googleEmail: string | null = null;
  try {
    const me = await oauth2.userinfo.get();
    googleEmail = me.data.email ?? null;
  } catch {
    // optional
  }

  const db = getDb();
  const refreshToken = tokens.refresh_token || getStoredTokens(userId)!.refresh_token;
  const expiresAt = tokens.expiry_date ?? null;

  db.prepare(
    `INSERT INTO google_drive_tokens (user_id, refresh_token, access_token, expires_at, google_email, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       refresh_token = excluded.refresh_token,
       access_token = excluded.access_token,
       expires_at = excluded.expires_at,
       google_email = COALESCE(excluded.google_email, google_email),
       updated_at = datetime('now')`
  ).run(userId, refreshToken, tokens.access_token ?? null, expiresAt, googleEmail);
}

export function disconnectDrive(userId: number) {
  const db = getDb();
  db.prepare(`DELETE FROM google_drive_tokens WHERE user_id = ?`).run(userId);
}

async function getAuthenticatedClient(userId: number) {
  const stored = getStoredTokens(userId);
  if (!stored?.refresh_token) {
    throw new Error("DRIVE_NOT_CONNECTED");
  }

  const client = getOAuthClient();
  client.setCredentials({
    refresh_token: stored.refresh_token,
    access_token: stored.access_token ?? undefined,
    expiry_date: stored.expires_at ?? undefined,
  });

  client.on("tokens", (tokens) => {
    const db = getDb();
    db.prepare(
      `UPDATE google_drive_tokens SET
         access_token = COALESCE(?, access_token),
         refresh_token = COALESCE(?, refresh_token),
         expires_at = COALESCE(?, expires_at),
         updated_at = datetime('now')
       WHERE user_id = ?`
    ).run(
      tokens.access_token ?? null,
      tokens.refresh_token ?? null,
      tokens.expiry_date ?? null,
      userId
    );
  });

  return client;
}

async function getDrive(userId: number): Promise<drive_v3.Drive> {
  const auth = await getAuthenticatedClient(userId);
  return google.drive({ version: "v3", auth });
}

async function findOrCreateFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string
): Promise<string> {
  const q = [
    "mimeType = 'application/vnd.google-apps.folder'",
    `name = '${name.replace(/'/g, "\\'")}'`,
    "trashed = false",
    parentId ? `'${parentId}' in parents` : "'root' in parents",
  ].join(" and ");

  const existing = await drive.files.list({
    q,
    fields: "files(id)",
    pageSize: 1,
    supportsAllDrives: true,
  });

  const found = existing.data.files?.[0]?.id;
  if (found) return found;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {}),
    },
    fields: "id",
    supportsAllDrives: true,
  });

  if (!created.data.id) throw new Error("FOLDER_CREATE_FAILED");
  return created.data.id;
}

export function validateAttachment(file: File, maxBytes: number) {
  if (file.size <= 0) return "File is empty.";
  if (file.size > maxBytes) {
    return `File is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`;
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime)) {
    return "Only images (JPEG, PNG, WebP) and PDF files are allowed.";
  }
  return null;
}

export function maxAttachmentBytes() {
  const raw = Number(process.env.MAX_ATTACHMENT_BYTES || 10 * 1024 * 1024);
  return Number.isFinite(raw) && raw > 0 ? raw : 10 * 1024 * 1024;
}

export async function uploadToUserDrive(input: {
  userId: number;
  buffer: Buffer;
  filename: string;
  mimeType: string;
  bookTitle: string;
  occurredOn: string;
  transactionId: number;
}) {
  const drive = await getDrive(input.userId);

  const loanFolderId = await findOrCreateFolder(drive, LOAN_FOLDER);
  const safeBook = input.bookTitle.replace(/[\\/:*?"<>|]/g, "-").slice(0, 80);
  const bookFolderId = await findOrCreateFolder(drive, safeBook, loanFolderId);
  const entryFolderName = `${input.occurredOn}-${input.transactionId}`;
  const entryFolderId = await findOrCreateFolder(drive, entryFolderName, bookFolderId);

  const { Readable } = await import("stream");
  const body = Readable.from(input.buffer);

  const created = await drive.files.create({
    requestBody: {
      name: input.filename,
      parents: [entryFolderId],
    },
    media: {
      mimeType: input.mimeType,
      body,
    },
    fields: "id, name, mimeType, size, webViewLink, webContentLink",
    supportsAllDrives: true,
  });

  const file = created.data;
  if (!file.id) throw new Error("UPLOAD_FAILED");

  return {
    driveFileId: file.id,
    filename: file.name || input.filename,
    mimeType: file.mimeType || input.mimeType,
    sizeBytes: file.size ? Number(file.size) : input.buffer.length,
    webViewLink: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
  };
}

export async function deleteDriveFile(userId: number, driveFileId: string) {
  try {
    const drive = await getDrive(userId);
    await drive.files.delete({ fileId: driveFileId, supportsAllDrives: true });
  } catch {
    // best-effort cleanup
  }
}
