import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import List from "./pages/List";
import Detail from "./pages/Detail";

export default function App() {
  // BrowserRouter basename will be set automatically when served under /campaign/
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL || "/campaign/"}>
      <header style={{ padding: 12, borderBottom: "1px solid #ddd" }}>
        <nav>
          <Link to="/">Home</Link> | <Link to="/list">Campaigns</Link>
        </nav>
      </header>
      <main style={{ padding: 12 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/list" element={<List />} />
          <Route path="/campaign/:id" element={<Detail />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
