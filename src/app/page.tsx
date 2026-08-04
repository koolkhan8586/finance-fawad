import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  getDb();
  const session = await getSession();
  redirect(session ? "/dashboard" : "/login");
}
