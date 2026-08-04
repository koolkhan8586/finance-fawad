"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteTransactionButton({
  bookId,
  transactionId,
}: {
  bookId: number;
  transactionId: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this entry?")) return;
    setLoading(true);
    try {
      await fetch(`/api/books/${bookId}/transactions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={loading}
      className="text-xs text-[var(--ink-soft)] hover:text-[var(--danger)] disabled:opacity-50"
    >
      Delete
    </button>
  );
}
