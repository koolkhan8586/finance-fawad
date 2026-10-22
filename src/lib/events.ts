import { getDb } from "./db";
import type { EventBudgetLine, EventItem } from "./types";

export function listEventsForUser(userId: number, isAdmin: boolean): EventItem[] {
  const db = getDb();
  const rows = (
    isAdmin
      ? db
          .prepare(
            `SELECT e.*,
               COALESCE((SELECT SUM(planned_amount) FROM event_budget_lines WHERE event_id = e.id), 0) AS planned_total,
               COALESCE((SELECT SUM(actual_amount) FROM event_budget_lines WHERE event_id = e.id), 0) AS actual_total
             FROM events e
             ORDER BY COALESCE(e.event_date, e.created_at) DESC, e.id DESC`
          )
          .all()
      : db
          .prepare(
            `SELECT e.*,
               COALESCE((SELECT SUM(planned_amount) FROM event_budget_lines WHERE event_id = e.id), 0) AS planned_total,
               COALESCE((SELECT SUM(actual_amount) FROM event_budget_lines WHERE event_id = e.id), 0) AS actual_total
             FROM events e
             WHERE e.created_by = ?
             ORDER BY COALESCE(e.event_date, e.created_at) DESC, e.id DESC`
          )
          .all(userId)
  ) as EventItem[];

  return rows.map((r) => ({
    ...r,
    planned_total: Number(r.planned_total || 0),
    actual_total: Number(r.actual_total || 0),
  }));
}

export function getEvent(eventId: number): EventItem | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT e.*,
         COALESCE((SELECT SUM(planned_amount) FROM event_budget_lines WHERE event_id = e.id), 0) AS planned_total,
         COALESCE((SELECT SUM(actual_amount) FROM event_budget_lines WHERE event_id = e.id), 0) AS actual_total
       FROM events e WHERE e.id = ?`
    )
    .get(eventId) as EventItem | undefined;
  if (!row) return null;
  return {
    ...row,
    planned_total: Number(row.planned_total || 0),
    actual_total: Number(row.actual_total || 0),
  };
}

export function userCanAccessEvent(userId: number, role: string, eventId: number) {
  if (role === "admin") return true;
  const db = getDb();
  const row = db
    .prepare(`SELECT 1 AS ok FROM events WHERE id = ? AND created_by = ?`)
    .get(eventId, userId);
  return Boolean(row);
}

export function createEvent(input: {
  title: string;
  description?: string;
  eventDate?: string | null;
  createdBy: number;
}) {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO events (title, description, event_date, created_by)
       VALUES (?, ?, ?, ?)`
    )
    .run(
      input.title.trim(),
      input.description?.trim() || null,
      input.eventDate || null,
      input.createdBy
    );
  return Number(result.lastInsertRowid);
}

export function updateEvent(
  eventId: number,
  input: { title?: string; description?: string | null; eventDate?: string | null }
) {
  const db = getDb();
  const current = getEvent(eventId);
  if (!current) return false;
  db.prepare(
    `UPDATE events SET title = ?, description = ?, event_date = ? WHERE id = ?`
  ).run(
    (input.title ?? current.title).trim(),
    input.description === undefined
      ? current.description
      : input.description?.trim() || null,
    input.eventDate === undefined ? current.event_date : input.eventDate || null,
    eventId
  );
  return true;
}

export function deleteEvent(eventId: number) {
  const db = getDb();
  db.prepare(`DELETE FROM events WHERE id = ?`).run(eventId);
}

export function listBudgetLines(eventId: number): EventBudgetLine[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM event_budget_lines
       WHERE event_id = ?
       ORDER BY sort_order ASC, id ASC`
    )
    .all(eventId) as EventBudgetLine[];
}

export function addBudgetLine(input: {
  eventId: number;
  category: string;
  plannedAmount?: number;
  actualAmount?: number;
  notes?: string;
}) {
  const db = getDb();
  const maxOrder = db
    .prepare(
      `SELECT COALESCE(MAX(sort_order), 0) AS m FROM event_budget_lines WHERE event_id = ?`
    )
    .get(input.eventId) as { m: number };

  const result = db
    .prepare(
      `INSERT INTO event_budget_lines
         (event_id, category, planned_amount, actual_amount, notes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.eventId,
      input.category.trim(),
      input.plannedAmount ?? 0,
      input.actualAmount ?? 0,
      input.notes?.trim() || null,
      Number(maxOrder.m) + 1
    );
  return Number(result.lastInsertRowid);
}

export function updateBudgetLine(
  lineId: number,
  eventId: number,
  input: {
    category?: string;
    plannedAmount?: number;
    actualAmount?: number;
    notes?: string | null;
  }
) {
  const db = getDb();
  const current = db
    .prepare(`SELECT * FROM event_budget_lines WHERE id = ? AND event_id = ?`)
    .get(lineId, eventId) as EventBudgetLine | undefined;
  if (!current) return false;

  db.prepare(
    `UPDATE event_budget_lines
     SET category = ?, planned_amount = ?, actual_amount = ?, notes = ?
     WHERE id = ? AND event_id = ?`
  ).run(
    (input.category ?? current.category).trim(),
    input.plannedAmount ?? current.planned_amount,
    input.actualAmount ?? current.actual_amount,
    input.notes === undefined ? current.notes : input.notes?.trim() || null,
    lineId,
    eventId
  );
  return true;
}

export function deleteBudgetLine(lineId: number, eventId: number) {
  const db = getDb();
  return db
    .prepare(`DELETE FROM event_budget_lines WHERE id = ? AND event_id = ?`)
    .run(lineId, eventId);
}
