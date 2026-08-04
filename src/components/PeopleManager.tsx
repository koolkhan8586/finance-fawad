"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Person = {
  id: number;
  name: string;
  username: string;
  role: "admin" | "member";
  email: string | null;
  whatsapp_phone: string | null;
  has_whatsapp_key?: boolean;
};

export function PeopleManager({
  people,
  currentUserId,
}: {
  people: Person[];
  currentUserId: number;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // create form
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappApikey, setWhatsappApikey] = useState("");

  // edit form
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "member">("member");
  const [editEmail, setEditEmail] = useState("");
  const [editWhatsappPhone, setEditWhatsappPhone] = useState("");
  const [editWhatsappApikey, setEditWhatsappApikey] = useState("");

  function startEdit(person: Person) {
    setEditingId(person.id);
    setEditName(person.name);
    setEditUsername(person.username);
    setEditPassword("");
    setEditRole(person.role);
    setEditEmail(person.email || "");
    setEditWhatsappPhone(person.whatsapp_phone || "");
    setEditWhatsappApikey("");
    setError("");
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          username,
          password,
          email,
          whatsappPhone,
          whatsappApikey,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create user");
        return;
      }
      setName("");
      setUsername("");
      setPassword("");
      setEmail("");
      setWhatsappPhone("");
      setWhatsappApikey("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function onUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          username: editUsername,
          role: editRole,
          password: editPassword || undefined,
          email: editEmail,
          whatsappPhone: editWhatsappPhone,
          whatsappApikey: editWhatsappApikey || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not update user");
        return;
      }
      setEditingId(null);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(person: Person) {
    if (person.id === currentUserId) {
      setError("You cannot delete your own account.");
      return;
    }
    if (!confirm(`Delete ${person.name}? This cannot be undone.`)) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${person.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not delete user");
        return;
      }
      if (editingId === person.id) setEditingId(null);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onCreate} className="surface rounded-2xl p-4 sm:p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Add login</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm text-[var(--ink-soft)]">
            Full name
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="text-sm text-[var(--ink-soft)]">
            Username
            <input
              className="field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              required
            />
          </label>
          <label className="text-sm text-[var(--ink-soft)]">
            Password
            <input
              type="password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-sm text-[var(--ink-soft)]">
            Email (for alerts)
            <input
              type="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="optional"
            />
          </label>
          <label className="text-sm text-[var(--ink-soft)]">
            WhatsApp phone
            <input
              className="field"
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
              placeholder="+923001234567"
            />
          </label>
          <label className="text-sm text-[var(--ink-soft)]">
            CallMeBot API key
            <input
              className="field"
              value={whatsappApikey}
              onChange={(e) => setWhatsappApikey(e.target.value)}
              placeholder="free WhatsApp key"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-[var(--ink-soft)]">
          Alerts: WhatsApp first (free via CallMeBot), otherwise email if SMTP is set on the server.
        </p>
        <button type="submit" disabled={loading} className="btn-primary mt-4 w-full sm:w-auto">
          {loading ? "Saving…" : "Create login"}
        </button>
      </form>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="space-y-2">
        {people.map((person, index) => (
          <li
            key={person.id}
            className="row-enter surface rounded-2xl px-4 py-4 sm:px-5"
            style={{ animationDelay: `${index * 0.04}s` }}
          >
            {editingId === person.id ? (
              <form onSubmit={onUpdate} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-[var(--ink-soft)]">
                    Full name
                    <input
                      className="field"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </label>
                  <label className="text-sm text-[var(--ink-soft)]">
                    Username
                    <input
                      className="field"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      required
                    />
                  </label>
                  <label className="text-sm text-[var(--ink-soft)]">
                    New password (optional)
                    <input
                      type="password"
                      className="field"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      minLength={6}
                      placeholder="leave blank to keep"
                    />
                  </label>
                  <label className="text-sm text-[var(--ink-soft)]">
                    Role
                    <select
                      className="field"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as "admin" | "member")}
                    >
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                    </select>
                  </label>
                  <label className="text-sm text-[var(--ink-soft)]">
                    Email
                    <input
                      type="email"
                      className="field"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                  </label>
                  <label className="text-sm text-[var(--ink-soft)]">
                    WhatsApp phone
                    <input
                      className="field"
                      value={editWhatsappPhone}
                      onChange={(e) => setEditWhatsappPhone(e.target.value)}
                    />
                  </label>
                  <label className="text-sm text-[var(--ink-soft)] sm:col-span-2">
                    CallMeBot API key {person.has_whatsapp_key ? "(saved — enter new to replace)" : ""}
                    <input
                      className="field"
                      value={editWhatsappApikey}
                      onChange={(e) => setEditWhatsappApikey(e.target.value)}
                      placeholder={person.has_whatsapp_key ? "••••••" : "optional"}
                    />
                  </label>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
                    Save changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="w-full rounded-xl border border-[var(--line)] px-4 py-3 text-sm sm:w-auto sm:py-2"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--ink)]">{person.name}</p>
                  <p className="text-sm text-[var(--ink-soft)]">@{person.username}</p>
                  <p className="mt-1 text-xs text-[var(--ink-soft)]">
                    {person.email || "no email"}
                    {" · "}
                    {person.whatsapp_phone
                      ? `WA ${person.whatsapp_phone}${person.has_whatsapp_key ? " ✓" : " (need API key)"}`
                      : "no WhatsApp"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-[var(--moss)]">
                    {person.role}
                  </span>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(person)}
                      className="text-xs font-medium text-[var(--moss)] hover:underline"
                    >
                      Edit
                    </button>
                    {person.id !== currentUserId ? (
                      <button
                        type="button"
                        onClick={() => onDelete(person)}
                        className="text-xs text-[var(--ink-soft)] hover:text-[var(--danger)]"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
