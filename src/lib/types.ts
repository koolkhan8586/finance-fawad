export type UserRole = "admin" | "member";

export type TransactionType =
  | "gave"
  | "received"
  | "expense"
  | "settlement"
  | "adjustment";

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface Book {
  id: number;
  title: string;
  description: string | null;
  created_by: number;
  created_at: string;
}

export interface BookMember {
  book_id: number;
  user_id: number;
  name: string;
  username: string;
}

export interface Transaction {
  id: number;
  book_id: number;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string | null;
  occurred_on: string;
  created_by: number;
  from_user_id: number | null;
  to_user_id: number | null;
  paid_by_user_id: number | null;
  split_with_user_id: number | null;
  created_at: string;
  created_by_name?: string;
  from_user_name?: string | null;
  to_user_name?: string | null;
  paid_by_name?: string | null;
  split_with_name?: string | null;
}

export interface BookBalance {
  user_id: number;
  name: string;
  balance: number;
}

export interface SessionPayload {
  userId: number;
  username: string;
  name: string;
  role: UserRole;
}
