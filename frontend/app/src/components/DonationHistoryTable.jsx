import { formatCurrency, formatDate } from "../lib/formatters.js";

export default function DonationHistoryTable({ items }) {
  if (!items.length) {
    return <p className="muted">No donation events recorded yet.</p>;
  }

  return (
    <div className="table-scroll">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr
            style={{
              textAlign: "left",
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <th>When</th>
            <th>Status</th>
            <th>Amount</th>
            <th>Source</th>
            <th>Pledge</th>
            <th>Payment</th>
          </tr>
        </thead>
        <tbody>
          {items.map((entry) => (
            <tr key={entry.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td>{formatDate(entry.occurred_at)}</td>
              <td>{entry.status}</td>
              <td>{formatCurrency(entry.amount)}</td>
              <td>{entry.source}</td>
              <td>{entry.pledge_id || "—"}</td>
              <td>{entry.payment_id || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
