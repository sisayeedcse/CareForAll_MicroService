import { formatCurrency } from "../lib/formatters.js";

export default function StatCard({ label, value, isCurrency }) {
  return (
    <div className="card" style={{ minHeight: 120 }}>
      <p
        className="muted"
        style={{ margin: 0, textTransform: "uppercase", fontSize: "0.75rem" }}
      >
        {label}
      </p>
      <h2 style={{ marginTop: 12 }}>
        {isCurrency ? formatCurrency(value) : value}
      </h2>
    </div>
  );
}
