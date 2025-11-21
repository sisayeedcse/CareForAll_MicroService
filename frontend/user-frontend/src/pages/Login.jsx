import React, { useState } from "react";
import api from "../api/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/users/login", { email, password });
      setMsg("Login success (token stored in response)");
      console.log(res.data);
    } catch (err) {
      setMsg("Login failed");
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={submit}>
        <div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
          />
        </div>
        <div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            type="password"
          />
        </div>
        <div>
          <button>Login</button>
        </div>
      </form>
      <div>{msg}</div>
    </div>
  );
}
