"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-[var(--ink)] transition hover:bg-white/70"
    >
      Log out
    </button>
  );
}
