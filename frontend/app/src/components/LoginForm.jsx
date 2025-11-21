import { useState } from "react";
import { apiRequest } from "../lib/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginForm() {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const update = (field) => (event) =>
    setCredentials((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const response = await apiRequest("/api/users/login", {
        method: "POST",
        body: credentials,
      });
      login(response.token);
      setStatus({ type: "success", message: "Signed in" });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ gap: 8 }}>
      <h3>Admin sign in</h3>
      <input
        className="input"
        type="email"
        placeholder="Email"
        value={credentials.email}
        onChange={update("email")}
        required
      />
      <input
        className="input"
        type="password"
        placeholder="Password"
        value={credentials.password}
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
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
