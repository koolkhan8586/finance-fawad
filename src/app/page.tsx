import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export default async function HomePage() {
  getDb();
  const session = await getSession();
  redirect(session ? "/dashboard" : "/login");
}
