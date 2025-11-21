import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";

export default function Detail() {
  const { id } = useParams();
  const [user, setUser] = useState(null);

  useEffect(() => {
    api
      .get(`/users/${id}`)
      .then((r) => setUser(r.data))
      .catch(() => {});
  }, [id]);

  if (!user) return <div>Loading...</div>;
  return (
    <div>
      <h2>{user.username || user.email}</h2>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </div>
  );
}
