import { useEffect, useState } from "react";
import { nanoid } from "nanoid";
import { apiRequest } from "../lib/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";

const DEFAULT_STATE = { campaignId: "", userId: "", amount: "" };

export default function PledgeForm({ campaignId: presetId, onSuccess }) {
  const [form, setForm] = useState(() => ({
    ...DEFAULT_STATE,
    campaignId: presetId ? String(presetId) : "",
  }));
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (presetId) {
      setForm((prev) => ({ ...prev, campaignId: String(presetId) }));
    }
  }, [presetId]);

  const update = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const payload = {
        campaign_id: Number(form.campaignId),
        user_id: isAuthenticated ? Number(user?.id) : Number(form.userId || 0),
        amount: Number(form.amount),
      };

      await apiRequest("/api/pledges/pledges", {
        method: "POST",
        body: payload,
        headers: {
          "Idempotency-Key": nanoid(),
        },
      });

      setStatus({ type: "success", message: "Pledge recorded" });
      setForm((prev) => ({ ...prev, amount: "" }));
      onSuccess?.();
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ gap: 8 }}>
      <h3>Quick pledge</h3>
      {!presetId && (
        <input
          className="input"
          type="number"
          min="1"
          placeholder="Campaign ID"
          value={form.campaignId}
          onChange={update("campaignId")}
          required
        />
      )}
      {isAuthenticated ? (
        <div
          className="muted"
          style={{
            background: "#f1f5f9",
            padding: "8px 12px",
            borderRadius: 8,
          }}
        >
          Pledging as <strong>{user?.name}</strong> (user #{user?.id})
        </div>
      ) : (
        <input
          className="input"
          type="number"
          min="0"
          placeholder="User ID (0 for guest)"
          value={form.userId}
          onChange={update("userId")}
          required
        />
      )}
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
        {loading ? "Submitting…" : "Pledge"}
      </button>
    </form>
  );
}
