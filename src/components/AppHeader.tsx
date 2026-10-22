"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";

type NavItem = { href: string; label: string };

export function AppHeader({
  name,
  links,
}: {
  name: string;
  links: NavItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[rgba(247,244,236,0.92)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-white/70 text-[var(--ink)] sm:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M4 7h16M4 12h16M4 17h16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
            <Link
              href="/dashboard"
              className="brand-mark font-[family-name:var(--font-display)] text-xl text-[var(--moss-deep)] sm:text-2xl"
            >
              Loan
            </Link>
          </div>

          <nav className="hidden items-center gap-3 text-sm font-medium text-[var(--ink-soft)] sm:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 hover:bg-white/60 hover:text-[var(--ink)] ${
                  isActive(link.href) ? "bg-white/70 text-[var(--ink)]" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
            <span className="max-w-[9rem] truncate text-[var(--ink)]">{name}</span>
            <LogoutButton />
          </nav>

          <div className="sm:hidden">
            <LogoutButton />
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 sm:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside
            className="absolute inset-y-0 left-0 flex w-[min(18rem,86vw)] flex-col border-r border-[var(--line)] bg-[var(--paper)] shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-4">
              <p className="font-[family-name:var(--font-display)] text-xl text-[var(--moss-deep)]">
                Menu
              </p>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm text-[var(--ink-soft)]"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 p-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-xl px-3 py-3 text-base font-medium ${
                    isActive(link.href)
                      ? "bg-white text-[var(--ink)]"
                      : "text-[var(--ink-soft)] hover:bg-white/70 hover:text-[var(--ink)]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-[var(--line)] px-4 py-4">
              <p className="truncate text-sm text-[var(--ink)]">{name}</p>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
