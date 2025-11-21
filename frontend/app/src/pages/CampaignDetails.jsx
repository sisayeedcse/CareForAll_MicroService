import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DonationHistoryTable from "../components/DonationHistoryTable.jsx";
import PledgeForm from "../components/PledgeForm.jsx";
import { apiRequest } from "../lib/apiClient.js";
import { formatCurrency } from "../lib/formatters.js";

const PAGE_LIMIT = 20;

export default function CampaignDetails() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: PAGE_LIMIT,
    offset: 0,
  });
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCampaign = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/api/campaigns/${id}`);
      setCampaign(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (offset = 0, append = offset > 0) => {
    setHistoryLoading(true);
    try {
      const result = await apiRequest(`/api/campaigns/${id}/donations`, {
        params: { limit: PAGE_LIMIT, offset },
      });
      setHistory((prev) => (append ? [...prev, ...result.data] : result.data));
      setPagination({ ...result.pagination });
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaign();
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return <p>Loading campaign…</p>;
  }

  if (error) {
    return (
      <div>
        <p style={{ color: "#dc2626" }}>Failed to load campaign: {error}</p>
        <Link to="/" className="btn secondary">
          Back to overview
        </Link>
      </div>
    );
  }

  if (!campaign) {
    return <p>Campaign not found.</p>;
  }

  return (
    <div className="grid" style={{ gap: 24 }}>
      <Link to="/" style={{ textDecoration: "none" }}>
        ← Back
      </Link>
      <section className="card">
        <h2>{campaign.title}</h2>
        <p className="muted">{campaign.description}</p>
        <div className="grid cols-3" style={{ marginTop: 16 }}>
          <Metric label="Goal" value={formatCurrency(campaign.goal_amount)} />
          <Metric
            label="Captured"
            value={formatCurrency(campaign.captured_amount)}
          />
          <Metric
            label="Pending"
            value={formatCurrency(campaign.pending_amount)}
          />
          <Metric
            label="Authorized"
            value={formatCurrency(campaign.authorized_amount)}
          />
          <Metric
            label="Failed"
            value={formatCurrency(campaign.failed_amount)}
          />
          <Metric label="Pledges" value={campaign.total_pledges} />
        </div>
      </section>

      <section
        className="grid"
        style={{ gridTemplateColumns: "2fr 1fr", gap: 24 }}
      >
        <div className="card">
          <div className="page-heading">
            <h3>Donation timeline</h3>
            <span className="muted">powered by donation_history table</span>
          </div>
          <DonationHistoryTable items={history} />
          {pagination.hasMore && (
            <button
              className="btn secondary"
              style={{ marginTop: 12 }}
              onClick={() =>
                fetchHistory(pagination.offset + pagination.limit, true)
              }
              disabled={historyLoading}
            >
              {historyLoading ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
        <PledgeForm
          campaignId={campaign.id}
          onSuccess={() => {
            fetchCampaign();
            fetchHistory();
          }}
        />
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <div
        className="muted"
        style={{ textTransform: "uppercase", fontSize: "0.75rem" }}
      >
        {label}
      </div>
      <strong>{value}</strong>
    </div>
  );
}
