import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

export default function List() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/campaigns")
      .then((res) => {
        if (!cancelled) setItems(res.data || []);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!items.length) return <div>No campaigns found.</div>;

  return (
    <ul>
      {items.map((c) => (
        <li key={c.id}>
          <Link to={`/campaign/${c.id}`}>{c.title || `Campaign ${c.id}`}</Link>
        </li>
      ))}
    </ul>
  );
}
