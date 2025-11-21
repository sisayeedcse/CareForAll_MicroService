import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";

export default function Detail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/campaigns/${id}`)
      .then((res) => {
        if (!cancelled) setItem(res.data);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => (cancelled = true);
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!item) return <div>Campaign not found.</div>;

  return (
    <div>
      <h2>{item.title}</h2>
      <p>{item.description}</p>
      <p>Goal: {item.goal}</p>
    </div>
  );
}
