import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

export default function List() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api
      .get("/payments")
      .then((r) => setItems(r.data || []))
      .catch(() => {});
  }, []);
  return (
    <div>
      <h2>Payments</h2>
      <ul>
        {items.map((p) => (
          <li key={p.id}>
            <Link to={`/payment/${p.id}`}>
              Payment {p.id} - {p.status}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
