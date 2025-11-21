import { useState } from "react";
import { apiRequest } from "../lib/apiClient.js";

export default function RegisterForm() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await apiRequest("/api/users/register", { method: "POST", body: form });
      setStatus({
        type: "success",
        message: "Account created. You can log in now.",
      });
      setForm({ name: "", email: "", password: "" });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ gap: 8 }}>
      <h3>Register admin</h3>
      <input
        className="input"
        placeholder="Name"
        value={form.name}
        onChange={update("name")}
        required
      />
      <input
        className="input"
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={update("email")}
        required
      />
      <input
        className="input"
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={update("password")}
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
        {loading ? "Registering…" : "Register"}
      </button>
    </form>
  );
}
