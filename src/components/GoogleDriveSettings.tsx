"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type DriveStatus = {
  configured: boolean;
  connected: boolean;
  email: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: "Google Drive is not configured on the server yet.",
  missing_code: "Google sign-in was cancelled.",
  invalid_state: "Sign-in expired. Please try again.",
  no_refresh_token: "Could not get Drive access. Disconnect in Google Account and try again.",
  callback_failed: "Google sign-in failed. Please try again.",
};

export function GoogleDriveSettings() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const connected = searchParams.get("connected");
    const err = searchParams.get("error");
    if (connected === "1") {
      setMessage("Google Drive connected. Receipt uploads will go to your Drive, not this server.");
    }
    if (err) {
      setError(ERROR_MESSAGES[err] || "Google sign-in failed.");
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/google-drive/status");
        const data = await res.json();
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setError("Could not load Google Drive status.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function disconnect() {
    setDisconnecting(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/google-drive/disconnect", { method: "POST" });
      if (!res.ok) {
        setError("Could not disconnect.");
        return;
      }
      setStatus((prev) =>
        prev ? { ...prev, connected: false, email: null } : prev
      );
      setMessage("Google Drive disconnected.");
      router.replace("/settings");
    } catch {
      setError("Network error.");
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return (
      <div className="surface rounded-2xl p-5 text-sm text-[var(--ink-soft)]">
        Checking Google Drive…
      </div>
    );
  }

  if (!status?.configured) {
    return (
      <div className="surface rounded-2xl p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Google Drive</h2>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          Server admin needs to set <code className="text-xs">GOOGLE_CLIENT_ID</code> and{" "}
          <code className="text-xs">GOOGLE_CLIENT_SECRET</code> in <code className="text-xs">.env</code>.
          Receipts are uploaded straight to your Google Drive — nothing is stored on the Loan server.
        </p>
      </div>
    );
  }

  return (
    <div className="surface rounded-2xl p-5">
      <h2 className="font-[family-name:var(--font-display)] text-xl">Google Drive</h2>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">
        Optional receipts on entries are saved to your Google Drive under a{" "}
        <span className="font-medium text-[var(--ink)]">Loan</span> folder — not on this server.
      </p>

      <div className="mt-4 rounded-xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm">
        {status.connected ? (
          <p>
            Connected as{" "}
            <span className="font-semibold text-[var(--ink)]">
              {status.email || "your Google account"}
            </span>
          </p>
        ) : (
          <p className="text-[var(--ink-soft)]">Not connected yet.</p>
        )}
      </div>

      {message ? <p className="mt-3 text-sm text-[var(--credit)]">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {status.connected ? (
          <button
            type="button"
            onClick={disconnect}
            disabled={disconnecting}
            className="w-full rounded-xl border border-[var(--line)] px-4 py-3 text-sm sm:w-auto sm:py-2 disabled:opacity-60"
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        ) : (
          <a href="/api/google-drive/connect" className="btn-primary w-full text-center sm:w-auto">
            Connect Google Drive
          </a>
        )}
      </div>
    </div>
  );
}
