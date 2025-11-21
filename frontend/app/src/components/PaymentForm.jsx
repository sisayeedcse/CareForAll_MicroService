import { useState } from "react";
import { apiRequest } from "../lib/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";

const INITIAL = { amount: "", pledgeId: "", campaignId: "" };

export default function PaymentForm({ onSuccess }) {
  const [form, setForm] = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const { token, user } = useAuth();

  const update = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const body = {
        amount: Number(form.amount),
        pledgeId: form.pledgeId ? Number(form.pledgeId) : null,
        campaignId: form.campaignId ? Number(form.campaignId) : null,
      };

      const response = await apiRequest("/api/payments/charge", {
        method: "POST",
        body,
        token,
      });

      setStatus({
        type: "success",
        message: `Charge ${response.transactionId} captured`,
      });
      setForm(INITIAL);
      onSuccess?.();
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ gap: 8 }}>
      <h3>Capture payment</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Charging as <strong>{user?.name}</strong>. This hits payment-service →
        Stripe mock with full idempotency.
      </p>
      <input
        className="input"
        type="number"
        min="1"
        step="0.01"
        placeholder="Amount"
        value={form.amount}
        onChange={update("amount")}
        required
      />
      <input
        className="input"
        type="number"
        min="1"
        placeholder="Pledge ID (optional)"
        value={form.pledgeId}
        onChange={update("pledgeId")}
      />
      <input
        className="input"
        type="number"
        min="1"
        placeholder="Campaign ID (optional)"
        value={form.campaignId}
        onChange={update("campaignId")}
      />
      {status && (
        <div
          style={{
            color: status.type === "error" ? "#dc2626" : "#15803d",
            marginBottom: 8,
          }}
        >
          {status.message}
        </div>
      )}
      <button className="btn" disabled={loading}>
        {loading ? "Charging…" : "Charge"}
      </button>
    </form>
  );
}
