import { getDb } from "./db";
import type { PersonalExpense } from "./types";

import { PERSONAL_CATEGORIES } from "./categories";
export { PERSONAL_CATEGORIES };

export function listPersonalExpenses(userId: number, limit = 200): PersonalExpense[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM personal_expenses
       WHERE user_id = ?
       ORDER BY occurred_on DESC, id DESC
       LIMIT ?`
    )
    .all(userId, limit) as PersonalExpense[];
}

export function summarizePersonalExpenses(userId: number) {
  const db = getDb();
  const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
  const total = db
    .prepare(`SELECT COALESCE(SUM(amount), 0) AS t FROM personal_expenses WHERE user_id = ?`)
    .get(userId) as { t: number };
  const month = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS t FROM personal_expenses
       WHERE user_id = ? AND occurred_on LIKE ?`
    )
    .get(userId, `${monthKey}%`) as { t: number };

  const byCategory = db
    .prepare(
      `SELECT category, COALESCE(SUM(amount), 0) AS total
       FROM personal_expenses
       WHERE user_id = ? AND occurred_on LIKE ?
       GROUP BY category
       ORDER BY total DESC`
    )
    .all(userId, `${monthKey}%`) as { category: string; total: number }[];

  return {
    allTime: Number(total.t),
    thisMonth: Number(month.t),
    byCategory: byCategory.map((r) => ({
      category: r.category,
      total: Number(r.total),
    })),
  };
}

export function addPersonalExpense(input: {
  userId: number;
  amount: number;
  currency?: string;
  category: string;
  description?: string;
  occurredOn: string;
}) {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO personal_expenses
         (user_id, amount, currency, category, description, occurred_on)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.userId,
      input.amount,
      input.currency || "PKR",
      input.category.trim(),
      input.description?.trim() || null,
      input.occurredOn
    );
  return Number(result.lastInsertRowid);
}

export function updatePersonalExpense(
  id: number,
  userId: number,
  input: {
    amount?: number;
    currency?: string;
    category?: string;
    description?: string | null;
    occurredOn?: string;
  }
) {
  const db = getDb();
  const current = db
    .prepare(`SELECT * FROM personal_expenses WHERE id = ? AND user_id = ?`)
    .get(id, userId) as PersonalExpense | undefined;
  if (!current) return false;

  db.prepare(
    `UPDATE personal_expenses
     SET amount = ?, currency = ?, category = ?, description = ?, occurred_on = ?
     WHERE id = ? AND user_id = ?`
  ).run(
    input.amount ?? current.amount,
    input.currency ?? current.currency,
    (input.category ?? current.category).trim(),
    input.description === undefined
      ? current.description
      : input.description?.trim() || null,
    input.occurredOn ?? current.occurred_on,
    id,
    userId
  );
  return true;
}

export function deletePersonalExpense(id: number, userId: number) {
  const db = getDb();
  return db
    .prepare(`DELETE FROM personal_expenses WHERE id = ? AND user_id = ?`)
    .run(id, userId);
}
