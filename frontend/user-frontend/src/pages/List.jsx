import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

export default function List() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api
      .get("/users")
      .then((r) => setItems(r.data || []))
      .catch(() => {});
  }, []);

  return (
    <div>
      <h2>All users</h2>
      <ul>
        {items.map((u) => (
          <li key={u.id}>
            <Link to={`/user/${u.id}`}>
              {u.username || u.email || `User ${u.id}`}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
