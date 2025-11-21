# CareForAll Frontend Workspace

The `frontend/` directory now contains a unified CareForAll web portal (`frontend/app`) that surfaces every backend capability defined in the hackathon brief:

- **Overview dashboard** – hero + stat panels backed by `campaign_rollups`, inline pledge widget with `Idempotency-Key`, and a selectable donation activity feed powered by `GET /campaigns/:id/donations`.
- **Campaign drill-down** – deep dive per campaign showing donation history, pledge launcher, and real-time totals for pending/authorized/captured/failed buckets.
- **Admin & payment console** – register/login against `user_service`, create campaigns via `campaign_service`, and capture charges through `payment-service`’s `/payments/charge` endpoint (JWT forwarded automatically).

Legacy per-service demos (e.g., `campaign-frontend`, `payment-frontend`) remain for reference, but `frontend/app` is the professional single base-URL experience that judges should evaluate.

## Getting started

```powershell
cd frontend/app
npm install
npm run dev
```

By default the portal talks to `http://localhost:8080`, which is the nginx gateway exposed by `docker-compose.yml`. Override this by creating a `.env` file next to `package.json`:

```dotenv
VITE_API_BASE_URL="https://your-gateway"  # defaults to http://localhost:8080
```

## Key files

- `src/pages/Dashboard.jsx` – hero + metrics + live donation activity widget; all data flows through nginx at `/api/*`.
- `src/pages/CampaignDetails.jsx` – transparent history page for guests or admins.
- `src/pages/AdminPanel.jsx` – registration/login plus campaign creation and payment capture cards (JWT-aware).
- `src/components/PledgeForm.jsx` – donor UX respecting authenticated identity or guest fallback.
- `src/components/PaymentForm.jsx` – admin-only payment capture hitting Stripe-backed controller.
- `src/lib/apiClient.js` – shared fetch helper enforcing the gateway base URL.

No UI frameworks are used; the CSS-only styling makes it easy for judges to correlate every click with the underlying microservice call.
