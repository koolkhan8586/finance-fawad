import bcrypt from "bcryptjs";
import { getDb } from "./db";
import type { Book, BookBalance, BookMember, Transaction, User } from "./types";

export function listUsers(): User[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, username, name, role, created_at
       FROM users ORDER BY role DESC, name ASC`
    )
    .all() as User[];
}

export function createUser(input: {
  username: string;
  password: string;
  name: string;
  role?: "admin" | "member";
}) {
  const db = getDb();
  const passwordHash = bcrypt.hashSync(input.password, 10);
  const result = db
    .prepare(
      `INSERT INTO users (username, password_hash, name, role)
       VALUES (?, ?, ?, ?)`
    )
    .run(
      input.username.trim().toLowerCase(),
      passwordHash,
      input.name.trim(),
      input.role || "member"
    );
  return result.lastInsertRowid as number;
}

export function listBooksForUser(userId: number, isAdmin: boolean) {
  const db = getDb();
  if (isAdmin) {
    return db
      .prepare(
        `SELECT b.id, b.title, b.description, b.created_by, b.created_at
         FROM books b
         ORDER BY b.created_at DESC`
      )
      .all() as Book[];
  }
  return db
    .prepare(
      `SELECT b.id, b.title, b.description, b.created_by, b.created_at
       FROM books b
       JOIN book_members bm ON bm.book_id = b.id
       WHERE bm.user_id = ?
       ORDER BY b.created_at DESC`
    )
    .all(userId) as Book[];
}

export function getBook(bookId: number): Book | null {
  const db = getDb();
  return (
    (db
      .prepare(
        `SELECT id, title, description, created_by, created_at FROM books WHERE id = ?`
      )
      .get(bookId) as Book | undefined) || null
  );
}

export function getBookMembers(bookId: number): BookMember[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT bm.book_id, bm.user_id, u.name, u.username
       FROM book_members bm
       JOIN users u ON u.id = bm.user_id
       WHERE bm.book_id = ?
       ORDER BY u.name ASC`
    )
    .all(bookId) as BookMember[];
}

export function userCanAccessBook(userId: number, role: string, bookId: number) {
  if (role === "admin") return true;
  const db = getDb();
  const row = db
    .prepare(`SELECT 1 AS ok FROM book_members WHERE book_id = ? AND user_id = ?`)
    .get(bookId, userId);
  return Boolean(row);
}

export function createBook(input: {
  title: string;
  description?: string;
  createdBy: number;
  memberIds: number[];
}) {
  const db = getDb();
  const create = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO books (title, description, created_by) VALUES (?, ?, ?)`
      )
      .run(input.title.trim(), input.description?.trim() || null, input.createdBy);

    const bookId = Number(result.lastInsertRowid);
    const insertMember = db.prepare(
      `INSERT INTO book_members (book_id, user_id) VALUES (?, ?)`
    );
    const uniqueMembers = Array.from(new Set([input.createdBy, ...input.memberIds]));
    for (const memberId of uniqueMembers) {
      insertMember.run(bookId, memberId);
    }
    return bookId;
  });
  return create();
}

export function listTransactions(bookId: number): Transaction[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT
         t.*,
         cu.name AS created_by_name,
         fu.name AS from_user_name,
         tu.name AS to_user_name,
         pu.name AS paid_by_name,
         su.name AS split_with_name
       FROM transactions t
       JOIN users cu ON cu.id = t.created_by
       LEFT JOIN users fu ON fu.id = t.from_user_id
       LEFT JOIN users tu ON tu.id = t.to_user_id
       LEFT JOIN users pu ON pu.id = t.paid_by_user_id
       LEFT JOIN users su ON su.id = t.split_with_user_id
       WHERE t.book_id = ?
       ORDER BY t.occurred_on DESC, t.id DESC`
    )
    .all(bookId) as Transaction[];
}

export function addTransaction(input: {
  bookId: number;
  type: Transaction["type"];
  amount: number;
  currency?: string;
  description?: string;
  occurredOn: string;
  createdBy: number;
  fromUserId?: number | null;
  toUserId?: number | null;
  paidByUserId?: number | null;
  splitWithUserId?: number | null;
}) {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO transactions (
         book_id, type, amount, currency, description, occurred_on, created_by,
         from_user_id, to_user_id, paid_by_user_id, split_with_user_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.bookId,
      input.type,
      input.amount,
      input.currency || "PKR",
      input.description?.trim() || null,
      input.occurredOn,
      input.createdBy,
      input.fromUserId ?? null,
      input.toUserId ?? null,
      input.paidByUserId ?? null,
      input.splitWithUserId ?? null
    );
  return Number(result.lastInsertRowid);
}

export function deleteTransaction(id: number, bookId: number) {
  const db = getDb();
  return db.prepare(`DELETE FROM transactions WHERE id = ? AND book_id = ?`).run(id, bookId);
}

/**
 * Balance for user A relative to others in the book:
 * positive = others owe A; negative = A owes others.
 *
 * Rules:
 * - gave: from -> to means to owes from `amount`
 * - received: from -> to means from received from to, so from owes to less / to's claim reduces
 *   (same as: to gave to from) — to owes from decreases by amount (from's balance vs to increases? Wait)
 *
 * Simpler pairwise model for 2-person books:
 * For each pair, track net owed TO current viewer.
 *
 * For multi-member books we compute each user's net position:
 * - gave(from,to,amount): to's debt to from += amount
 *   => from.balance += amount, to.balance -= amount
 * - received(from,to,amount): from received money from to (to paid from)
 *   => same as gave(to,from,amount)
 *   => from.balance -= amount, to.balance += amount
 * - expense: paid_by paid `amount` for self + split_with (50/50)
 *   => paid_by's share = amount/2, other owes paid_by amount/2
 *   => paid_by.balance += amount/2, split_with.balance -= amount/2
 * - settlement: from settles with to by paying amount (from pays to)
 *   => from.balance += amount, to.balance -= amount  (reduces what from owed to)
 * - adjustment: from_user gets +amount relative to to_user (manual)
 *   => from.balance += amount, to.balance -= amount
 */
export function computeBalances(bookId: number): BookBalance[] {
  const members = getBookMembers(bookId);
  const balances = new Map<number, number>();
  for (const m of members) balances.set(m.user_id, 0);

  const txs = listTransactions(bookId);

  const credit = (userId: number | null | undefined, amount: number) => {
    if (!userId || !balances.has(userId)) return;
    balances.set(userId, (balances.get(userId) || 0) + amount);
  };

  for (const tx of txs) {
    const amount = Number(tx.amount);
    switch (tx.type) {
      case "gave":
        credit(tx.from_user_id, amount);
        credit(tx.to_user_id, -amount);
        break;
      case "received":
        credit(tx.from_user_id, -amount);
        credit(tx.to_user_id, amount);
        break;
      case "expense": {
        const share = amount / 2;
        credit(tx.paid_by_user_id, share);
        credit(tx.split_with_user_id, -share);
        break;
      }
      case "settlement":
        credit(tx.from_user_id, amount);
        credit(tx.to_user_id, -amount);
        break;
      case "adjustment":
        credit(tx.from_user_id, amount);
        credit(tx.to_user_id, -amount);
        break;
    }
  }

  return members.map((m) => ({
    user_id: m.user_id,
    name: m.name,
    balance: Math.round((balances.get(m.user_id) || 0) * 100) / 100,
  }));
}

export function summarizePairBalance(
  balances: BookBalance[],
  viewerId: number,
  otherId: number
) {
  const viewer = balances.find((b) => b.user_id === viewerId)?.balance || 0;
  const other = balances.find((b) => b.user_id === otherId)?.balance || 0;
  // In a 2-person book, viewer balance should be negative of other.
  // Positive viewer balance => other owes viewer.
  return {
    viewerBalance: viewer,
    otherBalance: other,
    otherOwesViewer: viewer > 0 ? viewer : 0,
    viewerOwesOther: viewer < 0 ? Math.abs(viewer) : 0,
  };
}
