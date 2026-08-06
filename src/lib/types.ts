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
  email: string | null;
  whatsapp_phone: string | null;
  whatsapp_apikey: string | null;
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
  email?: string | null;
  whatsapp_phone?: string | null;
  whatsapp_apikey?: string | null;
}

export interface Transaction {
  id: number;
  book_id: number;
  type: TransactionType;
  /** Always PKR — used for balances / totals */
  amount: number;
  currency: string;
  original_amount: number | null;
  exchange_rate: number | null;
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
