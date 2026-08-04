import { formatMoney } from "@/lib/format";

export function BalanceHero({
  myBalance,
  otherName,
  memberBalances,
}: {
  myBalance: number;
  otherName?: string;
  memberBalances: { user_id: number; name: string; balance: number }[];
}) {
  const abs = Math.abs(myBalance);
  const maxAbs = Math.max(
    abs,
    ...memberBalances.map((b) => Math.abs(b.balance)),
    1
  );
  const fillPct = Math.min(100, Math.round((abs / maxAbs) * 100));
  const isCredit = myBalance > 0;
  const isDebit = myBalance < 0;
  const tone = isCredit ? "credit" : isDebit ? "debit" : "neutral";

  return (
    <section
      className={`balance-pulse overflow-hidden rounded-2xl border p-4 sm:p-6 ${
        tone === "credit"
          ? "border-[var(--credit)]/25 bg-[linear-gradient(135deg,var(--credit-soft),rgba(255,255,255,0.85))]"
          : tone === "debit"
            ? "border-[var(--debit)]/25 bg-[linear-gradient(135deg,var(--debit-soft),rgba(255,255,255,0.85))]"
            : "border-[var(--line)] bg-white/60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)] sm:text-sm">
            Your position
          </p>
          <p
            className={`mt-2 font-[family-name:var(--font-display)] text-3xl leading-tight sm:text-4xl ${
              isCredit
                ? "text-[var(--credit)]"
                : isDebit
                  ? "text-[var(--debit)]"
                  : "text-[var(--ink-soft)]"
            }`}
          >
            {myBalance === 0
              ? "All settled"
              : isCredit
                ? `${formatMoney(myBalance)} owed to you`
                : `You owe ${formatMoney(abs)}`}
          </p>
          {otherName && myBalance !== 0 ? (
            <p className="mt-2 text-sm text-[var(--ink-soft)]">with {otherName}</p>
          ) : null}
        </div>
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white sm:h-16 sm:w-16 ${
            isCredit
              ? "bg-[var(--credit)]"
              : isDebit
                ? "bg-[var(--debit)]"
                : "bg-[var(--neutral)]"
          }`}
          aria-hidden
        >
          {isCredit ? "↑" : isDebit ? "↓" : "✓"}
        </div>
      </div>

      {/* Balance meter */}
      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-[11px] uppercase tracking-wide text-[var(--ink-soft)]">
          <span className="text-[var(--debit)]">You owe</span>
          <span>Settled</span>
          <span className="text-[var(--credit)]">Owed to you</span>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-white/80 ring-1 ring-[var(--line)]">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(90deg,#fecaca,transparent)]" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(90deg,transparent,#bbf7d0)]" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--ink)]/25" />
          {myBalance !== 0 ? (
            <div
              className={`meter-fill absolute top-0 h-full rounded-full ${
                isCredit ? "bg-[var(--credit)]" : "bg-[var(--debit)]"
              }`}
              style={{
                width: `${Math.max(8, fillPct / 2)}%`,
                left: isCredit ? "50%" : undefined,
                right: isDebit ? "50%" : undefined,
              }}
            />
          ) : (
            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--neutral)]" />
          )}
        </div>
        <p className="mt-2 text-center text-xs text-[var(--ink-soft)]">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[var(--credit)]" /> Green = money toward you
          </span>
          <span className="mx-2 text-[var(--line)]">·</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[var(--debit)]" /> Red = money from you
          </span>
        </p>
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {memberBalances.map((b) => {
          const positive = b.balance > 0;
          const negative = b.balance < 0;
          return (
            <li
              key={b.user_id}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm ${
                positive
                  ? "bg-[var(--credit-soft)] text-[var(--credit)]"
                  : negative
                    ? "bg-[var(--debit-soft)] text-[var(--debit)]"
                    : "bg-white/70 text-[var(--ink-soft)]"
              }`}
            >
              <span className="font-medium text-[var(--ink)]">{b.name}</span>
              <span className="font-semibold">
                {b.balance === 0
                  ? "even"
                  : positive
                    ? `+${formatMoney(b.balance)}`
                    : `−${formatMoney(Math.abs(b.balance))}`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
