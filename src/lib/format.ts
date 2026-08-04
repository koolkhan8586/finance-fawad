export function formatMoney(amount: number, currency = "PKR") {
  try {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function transactionLabel(type: string) {
  switch (type) {
    case "gave":
      return "Gave money";
    case "received":
      return "Received money";
    case "expense":
      return "Shared expense";
    case "settlement":
      return "Settlement";
    case "adjustment":
      return "Adjustment";
    default:
      return type;
  }
}

export function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

/** Cash-flow direction for the current user: in = green, out = red. */
export function cashFlowForUser(
  tx: {
    type: string;
    from_user_id?: number | null;
    to_user_id?: number | null;
    paid_by_user_id?: number | null;
    split_with_user_id?: number | null;
  },
  userId: number
): "in" | "out" | "neutral" {
  switch (tx.type) {
    case "gave":
      if (tx.to_user_id === userId) return "in"; // you took / received cash
      if (tx.from_user_id === userId) return "out"; // you gave cash
      return "neutral";
    case "received":
      if (tx.from_user_id === userId) return "in"; // you received
      if (tx.to_user_id === userId) return "out"; // they received from you
      return "neutral";
    case "expense":
      if (tx.paid_by_user_id === userId) return "out";
      if (tx.split_with_user_id === userId) return "in";
      return "neutral";
    case "settlement":
      if (tx.from_user_id === userId) return "out";
      if (tx.to_user_id === userId) return "in";
      return "neutral";
    case "adjustment":
      if (tx.from_user_id === userId) return "in";
      if (tx.to_user_id === userId) return "out";
      return "neutral";
    default:
      return "neutral";
  }
}

export function flowSign(flow: "in" | "out" | "neutral") {
  if (flow === "in") return "+";
  if (flow === "out") return "−";
  return "";
}
