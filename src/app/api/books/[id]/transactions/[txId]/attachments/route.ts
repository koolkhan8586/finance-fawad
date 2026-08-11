import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  getBook,
  addTransactionAttachment,
  getTransaction,
  userCanAccessBook,
} from "@/lib/ledger";
import {
  isDriveConnected,
  maxAttachmentBytes,
  uploadToUserDrive,
  validateAttachment,
} from "@/lib/google-drive";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; txId: string }> }
) {
  try {
    const session = await requireSession();
    const { id, txId } = await context.params;
    const bookId = Number(id);
    const transactionId = Number(txId);

    if (!userCanAccessBook(session.userId, session.role, bookId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isDriveConnected(session.userId)) {
      return NextResponse.json(
        { error: "Connect Google Drive in Settings before uploading receipts." },
        { status: 400 }
      );
    }

    const tx = getTransaction(transactionId, bookId);
    if (!tx) {
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    }

    const book = getBook(bookId);
    if (!book) {
      return NextResponse.json({ error: "Book not found." }, { status: 404 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const maxBytes = maxAttachmentBytes();
    const validationError = validateAttachment(file, maxBytes);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";
    const filename = file.name.replace(/[\\/:*?"<>|]/g, "-").slice(0, 200);

    const uploaded = await uploadToUserDrive({
      userId: session.userId,
      buffer,
      filename,
      mimeType,
      bookTitle: book.title,
      occurredOn: tx.occurred_on,
      transactionId,
    });

    const attachmentId = addTransactionAttachment({
      transactionId,
      uploadedBy: session.userId,
      driveFileId: uploaded.driveFileId,
      filename: uploaded.filename,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.sizeBytes,
      webViewLink: uploaded.webViewLink,
    });

    return NextResponse.json(
      {
        id: attachmentId,
        filename: uploaded.filename,
        webViewLink: uploaded.webViewLink,
      },
      { status: 201 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (msg === "DRIVE_NOT_CONNECTED") {
      return NextResponse.json(
        { error: "Connect Google Drive in Settings before uploading receipts." },
        { status: 400 }
      );
    }
    console.error("Attachment upload failed", e);
    return NextResponse.json({ error: "Upload to Google Drive failed." }, { status: 500 });
  }
}
