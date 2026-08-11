"use client";

import { useCallback, useEffect, useState } from "react";

type WahaStatus = {
  configured: boolean;
  url: string | null;
  session: string | null;
  reachable: boolean;
  connected: boolean;
  status: string | null;
  phone: string | null;
  error: string | null;
};

type EmailStatus = {
  configured: boolean;
  host: string | null;
  port: number | null;
  user: string | null;
  from: string | null;
  connected: boolean;
  error: string | null;
};

type NotifyStatus = {
  provider: "waha" | "textmebot" | "none";
  waha: WahaStatus;
  textmebot: { configured: boolean };
  email: EmailStatus;
};

function StatusDot({ ok, warn }: { ok: boolean; warn?: boolean }) {
  const color = ok ? "bg-[var(--credit)]" : warn ? "bg-amber-500" : "bg-[var(--danger)]";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} aria-hidden />;
}

export function NotificationSettings() {
  const [status, setStatus] = useState<NotifyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setChecking(true);
    else setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/notifications/status");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not check notification status.");
        return;
      }
      setStatus(data);
    } catch {
      setError("Network error while checking notification status.");
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="surface rounded-2xl p-5 text-sm text-[var(--ink-soft)]">
        Checking WAHA and email…
      </div>
    );
  }

  if (!status) {
    return (
      <div className="surface rounded-2xl p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Notifications</h2>
        <p className="mt-2 text-sm text-[var(--danger)]">{error || "Status unavailable."}</p>
        <button
          type="button"
          onClick={() => void load(true)}
          className="mt-4 rounded-xl border border-[var(--line)] px-4 py-2 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const { waha, email, textmebot } = status;

  return (
    <div className="surface rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl">Notifications</h2>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Live check of WhatsApp (WAHA) and email (SMTP) used for ledger alerts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={checking}
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-medium disabled:opacity-60"
        >
          {checking ? "Checking…" : "Recheck"}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-[var(--line)] bg-white/70 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
            <StatusDot
              ok={waha.connected}
              warn={waha.configured && waha.reachable && !waha.connected}
            />
            WhatsApp (WAHA)
          </div>
          {!waha.configured ? (
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              Not configured. Set <code className="text-xs">WAHA_URL</code> (and{" "}
              <code className="text-xs">WAHA_API_KEY</code>) in <code className="text-xs">.env</code>.
            </p>
          ) : waha.connected ? (
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              Connected
              {waha.phone ? (
                <>
                  {" "}
                  as <span className="font-medium text-[var(--ink)]">+{waha.phone}</span>
                </>
              ) : null}
              {waha.session ? (
                <>
                  {" "}
                  · session <span className="font-medium text-[var(--ink)]">{waha.session}</span>
                </>
              ) : null}
              {waha.status ? <> · {waha.status}</> : null}
            </p>
          ) : (
            <p className="mt-2 text-sm text-[var(--danger)]">
              {waha.error ||
                (!waha.reachable
                  ? "Cannot reach WAHA server."
                  : "WAHA is reachable but the WhatsApp session is not ready.")}
            </p>
          )}
          {waha.configured && waha.url ? (
            <p className="mt-1 text-xs text-[var(--ink-soft)]">URL: {waha.url}</p>
          ) : null}
        </div>

        {textmebot.configured ? (
          <div className="rounded-xl border border-[var(--line)] bg-white/70 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
              <StatusDot ok warn={!waha.connected} />
              TextMeBot (fallback)
            </div>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              API key is set. Used if WAHA is unavailable.
            </p>
          </div>
        ) : null}

        <div className="rounded-xl border border-[var(--line)] bg-white/70 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
            <StatusDot ok={email.connected} warn={email.configured && !email.connected} />
            Email (SMTP)
          </div>
          {!email.configured ? (
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              Not configured. Set <code className="text-xs">SMTP_HOST</code>,{" "}
              <code className="text-xs">SMTP_USER</code>, and{" "}
              <code className="text-xs">SMTP_PASS</code> in <code className="text-xs">.env</code>.
            </p>
          ) : email.connected ? (
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              Connected to{" "}
              <span className="font-medium text-[var(--ink)]">
                {email.host}:{email.port}
              </span>
              {email.user ? (
                <>
                  {" "}
                  as <span className="font-medium text-[var(--ink)]">{email.user}</span>
                </>
              ) : null}
            </p>
          ) : (
            <p className="mt-2 text-sm text-[var(--danger)]">
              {email.error || "SMTP is configured but the connection check failed."}
            </p>
          )}
          {email.configured && email.from ? (
            <p className="mt-1 text-xs text-[var(--ink-soft)]">From: {email.from}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
