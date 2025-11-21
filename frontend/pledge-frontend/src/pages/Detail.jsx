import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";

export default function Detail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  useEffect(() => {
    api
      .get(`/pledges/${id}`)
      .then((r) => setItem(r.data))
      .catch(() => {});
  }, [id]);
  if (!item) return <div>Loading...</div>;
  return (
    <div>
      <h2>Pledge {item.id}</h2>
      <pre>{JSON.stringify(item, null, 2)}</pre>
    </div>
  );
}
