import { useEffect, useMemo, useState } from "react";
import DonationHistoryTable from "./DonationHistoryTable.jsx";
import { apiRequest } from "../lib/apiClient.js";

const PAGE_SIZE = 10;

export default function CampaignActivity({ campaigns, selectedId, onChange }) {
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({
    limit: PAGE_SIZE,
    offset: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === selectedId) || null,
    [campaigns, selectedId]
  );

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    fetchHistory(selectedId, 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const fetchHistory = async (campaignId, offset = 0, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest(
        `/api/campaigns/${campaignId}/donations`,
        {
          params: { limit: PAGE_SIZE, offset },
        }
      );
      setHistory((prev) =>
        append ? [...prev, ...response.data] : response.data
      );
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!campaigns.length) {
    return (
      <div className="card">
        <h3>Live donation activity</h3>
        <p className="muted">
          Create your first campaign to start seeing donation telemetry.
        </p>
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>Live donation activity</h3>
          <p className="muted" style={{ margin: 0 }}>
            Pulled directly from donation_history read model; reflects pledge +
            payment events.
          </p>
        </div>
        <select
          className="input"
          style={{ maxWidth: 260, marginBottom: 0 }}
          value={selectedId || ""}
          onChange={(event) => onChange(Number(event.target.value))}
        >
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              #{campaign.id} · {campaign.title}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p style={{ color: "#dc2626" }}>Failed to load history: {error}</p>
      )}
      {loading && !history.length && <p>Loading activity…</p>}
      {!loading && !history.length && (
        <p className="muted">
          No donation events recorded yet for this campaign.
        </p>
      )}

      {history.length > 0 && <DonationHistoryTable items={history} />}

      {pagination.hasMore && (
        <button
          className="btn secondary"
          style={{ alignSelf: "flex-start" }}
          onClick={() =>
            selectedId &&
            fetchHistory(selectedId, pagination.offset + pagination.limit, true)
          }
          disabled={loading || !selectedId}
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
