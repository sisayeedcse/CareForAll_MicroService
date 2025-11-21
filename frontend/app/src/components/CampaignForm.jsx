import { useState } from "react";
import { apiRequest } from "../lib/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";

const INITIAL = { title: "", description: "", goal_amount: "" };

export default function CampaignForm({ onCreated }) {
  const [form, setForm] = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  const updateField = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        title: form.title,
        description: form.description,
        goal_amount: Number(form.goal_amount || 0),
      };
      await apiRequest("/api/campaigns", {
        method: "POST",
        body: payload,
        token,
      });
      setForm(INITIAL);
      onCreated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <h3>Create Campaign</h3>
      <input
        className="input"
        placeholder="Campaign title"
        value={form.title}
        onChange={updateField("title")}
        required
      />
      <textarea
        className="input"
        placeholder="Why does it matter?"
        value={form.description}
        onChange={updateField("description")}
        rows={4}
        required
      />
      <input
        className="input"
        placeholder="Goal amount"
        type="number"
        min="1"
        step="0.01"
        value={form.goal_amount}
        onChange={updateField("goal_amount")}
        required
      />
      {error && (
        <div style={{ color: "#dc2626", marginBottom: 12 }}>{error}</div>
      )}
      <button className="btn" disabled={loading}>
        {loading ? "Creating…" : "Create"}
      </button>
    </form>
  );
}
