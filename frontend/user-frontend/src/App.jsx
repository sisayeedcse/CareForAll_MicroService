import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import List from "./pages/List";
import Detail from "./pages/Detail";
import Login from "./pages/Login";

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL || "/user/"}>
      <header style={{ padding: 12, borderBottom: "1px solid #ddd" }}>
        <nav>
          <Link to="/">Home</Link> | <Link to="/list">Users</Link> |{" "}
          <Link to="/login">Login</Link>
        </nav>
      </header>
      <main style={{ padding: 12 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/list" element={<List />} />
          <Route path="/user/:id" element={<Detail />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
