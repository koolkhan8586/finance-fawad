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
