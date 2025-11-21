import { Link } from "react-router-dom";
import { formatCurrency } from "../lib/formatters.js";

export default function CampaignCard({ campaign }) {
  return (
    <article
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div>
        <div
          style={{
            fontSize: "0.8rem",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          #{campaign.id}
        </div>
        <h3 style={{ margin: "8px 0" }}>{campaign.title}</h3>
        <p className="muted" style={{ minHeight: 38 }}>
          {campaign.description}
        </p>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Stat label="Goal" value={formatCurrency(campaign.goal_amount)} />
        <Stat
          label="Captured"
          value={formatCurrency(campaign.captured_amount)}
          highlight
        />
        <Stat label="Pending" value={formatCurrency(campaign.pending_amount)} />
        <Stat label="Pledges" value={campaign.total_pledges} />
      </div>
      <Link
        className="btn"
        style={{ textAlign: "center" }}
        to={`/campaign/${campaign.id}`}
      >
        View timeline
      </Link>
    </article>
  );
}

function Stat({ label, value, highlight = false }) {
  return (
    <div>
      <div
        className="muted"
        style={{ fontSize: "0.75rem", textTransform: "uppercase" }}
      >
        {label}
      </div>
      <strong style={{ color: highlight ? "var(--accent)" : "inherit" }}>
        {value}
      </strong>
    </div>
  );
}
