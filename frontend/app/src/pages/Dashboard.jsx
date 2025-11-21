import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CampaignCard from "../components/CampaignCard.jsx";
import CampaignActivity from "../components/CampaignActivity.jsx";
import PledgeForm from "../components/PledgeForm.jsx";
import StatCard from "../components/StatCard.jsx";
import { apiRequest } from "../lib/apiClient.js";

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest("/api/campaigns");
      setCampaigns(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (!campaigns.length) {
      setSelectedCampaignId(null);
      return;
    }
    setSelectedCampaignId((prev) => prev ?? campaigns[0].id);
  }, [campaigns]);

  const totals = useMemo(
    () =>
      campaigns.reduce(
        (acc, item) => {
          acc.goal += Number(item.goal_amount || 0);
          acc.captured += Number(item.captured_amount || 0);
          acc.pending += Number(item.pending_amount || 0);
          acc.authorized += Number(item.authorized_amount || 0);
          acc.count += 1;
          return acc;
        },
        { goal: 0, captured: 0, pending: 0, authorized: 0, count: 0 }
      ),
    [campaigns]
  );

  return (
    <div className="grid" style={{ gap: 32 }}>
      <section className="hero">
        <div>
          <p
            className="muted"
            style={{ textTransform: "uppercase", letterSpacing: 1 }}
          >
            resilient donation control room
          </p>
          <h1>Observe, pledge, and reconcile in real time.</h1>
          <p>
            Every widget on this page talks directly to the microservices you
            hardened—campaign rollups, pledge idempotency, payment gateway, and
            the read-model donation timeline.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="btn" to="/admin">
              Go to admin panel
            </Link>
            <button className="btn secondary" onClick={fetchCampaigns}>
              Refresh data
            </button>
          </div>
        </div>
      </section>

      <section>
        <p className="muted" style={{ marginBottom: 12 }}>
          Snapshot powered by campaign rollups & pledge/payment outbox events.
        </p>
        <div className="grid cols-3">
          <StatCard label="Active campaigns" value={totals.count} />
          <StatCard
            label="Captured volume"
            value={totals.captured}
            isCurrency
          />
          <StatCard label="Pending pledges" value={totals.pending} isCurrency />
          <StatCard label="Authorized" value={totals.authorized} isCurrency />
        </div>
      </section>

      <section
        className="grid"
        style={{ gridTemplateColumns: "2fr 1fr", gap: 24 }}
      >
        <div className="grid cols-3">
          {loading && <p>Loading campaigns…</p>}
          {error && (
            <p style={{ color: "#dc2626" }}>
              Failed to load campaigns: {error}
            </p>
          )}
          {!loading && !campaigns.length && (
            <p className="muted">
              No campaigns yet. Sign in as an admin to create your first
              resilient fundraiser.
            </p>
          )}
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
        <div className="grid" style={{ gap: 16 }}>
          <PledgeForm
            presetId={selectedCampaignId}
            onSuccess={fetchCampaigns}
          />
          <div className="card">
            <h3>API topology</h3>
            <p className="muted" style={{ marginBottom: 8 }}>
              All calls go through nginx (`http://localhost:8080`). Use the
              Admin panel to register, issue JWTs, create campaigns, and capture
              payments.
            </p>
            <ul>
              <li>/api/users/* → user_service</li>
              <li>/api/campaigns/* → campaign_service</li>
              <li>/api/pledges/* → pledge-service</li>
              <li>/api/payments/* → payment-service</li>
            </ul>
          </div>
        </div>
      </section>

      <CampaignActivity
        campaigns={campaigns}
        selectedId={selectedCampaignId}
        onChange={setSelectedCampaignId}
      />
    </div>
  );
}
