const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const dateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export const formatCurrency = (value) => currency.format(Number(value) || 0);
export const formatDate = (value) => {
  if (!value) return "—";
  return dateTime.format(new Date(value));
};
