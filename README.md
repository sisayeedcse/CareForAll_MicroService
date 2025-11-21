# CareForAll Microservices Platform

CareForAll is a donation platform composed of independently deployable Node.js services that share a MySQL backbone and communicate through HTTP plus an internal event pipeline. The stack is containerised with Docker Compose so the entire system (frontend, gateway, services, and database) can be started with a single command.

## Core services

- **user_service** – authentication/authorization, JWT issuance, user identity context consumed by downstream APIs.
- **campaign_service** – campaign CRUD, admin tooling, read-model storage (materialised rollups, donation history), public donation history endpoint (`GET /campaigns/:id/donations`), and event ingestion endpoint (`POST /campaigns/events`).
- **pledge-service** – donor pledges, idempotent writes, transactional outbox, payment gateway webhook handler, and the donation state machine guard.
- **payment-service** – payment intent lifecycle with Stripe, hardened idempotency, webhook reconciliation, and outbox events for the read-model updater.
- **nginx gateway** – single entry point for the frontend, routes traffic to individual services while keeping a single base URL requirement.
- **frontend** – minimal demo shell, all calls flow through the gateway.

## Resilience & data flow

1. **Transactional outbox** – both pledge and payment services persist domain events in local MySQL tables inside the same transaction as their state change. Worker loops (`outboxDispatcher`) retry deliveries with exponential backoff until the campaign service acknowledges the event.
2. **Event ingestion & read models** – `campaign_service` exposes `/campaigns/events` to accept `PLEDGE_*` and `PAYMENT_*` events. Events are deduplicated (`campaign_event_log`), applied to a materialised view (`campaign_rollups`), and appended to `donation_history` for full audit trails.
3. **State machine enforcement** – pledge webhooks validate transitions (`PENDING → AUTHORIZED → CAPTURED/FAILED`) using `utils/stateMachine.js`. Invalid sequences are ignored so webhook disorder cannot corrupt totals.
4. **Idempotency** – Pledge APIs honour the `Idempotency-Key` header, while payment charges build deterministic keys per `(user, pledge, campaign, amount)` tuple. Duplicate webhook deliveries are absorbed by the outbox + dedupe tables.
5. **Read-optimised queries** – campaign APIs now join against `campaign_rollups`, exposing `pending_amount`, `authorized_amount`, `captured_amount`, `failed_amount`, `total_pledges`, and `total_payments` without recalculating aggregates at read time.

## Event contracts

| Event                   | Publisher       | Payload highlights                                        | Effect in campaign service                                                        |
| ----------------------- | --------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `PLEDGE_CREATED`        | pledge-service  | `pledge_id`, `campaign_id`, `user_id`, `amount`, `status` | Adds to pending bucket, increments pledge count, records donation history         |
| `PLEDGE_STATUS_CHANGED` | pledge-service  | `previous_status`, `new_status`, `amount`                 | Moves value between buckets per state transition, updates campaign current amount |
| `PAYMENT_CAPTURED`      | payment-service | `payment_id`, `pledge_id`, `campaign_id`, `amount`        | Increments payment counter, appends audit log                                     |
| `PAYMENT_FAILED`        | payment-service | `payment_id`, `campaign_id`, `amount`, `error`            | Tracks failed amounts + audit trail                                               |

## Running locally

```powershell
docker compose up --build
```

Environment defaults live in `.env.example`. Set `EVENT_DISPATCH_URL` if you run services outside of Compose so the outbox workers can reach the campaign ingestion endpoint.

## Observability & logging

The stack ships with Prometheus, Grafana, Loki, Promtail, node-exporter, and cAdvisor. Services now expose structured JSON logs plus `/metrics` endpoints (Prometheus format) on their respective ports.

### Start the monitoring stack

```powershell
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

- Prometheus: `http://localhost:9090` (targets for every service + infra exporters)
- Grafana: `http://localhost:3030` (user `admin` / `admin` by default, change via `GF_SECURITY_ADMIN_PASSWORD`)
- Loki API: `http://localhost:3100`

Grafana auto-provisions the datasources and dashboards found under `observability/grafana/provisioning/dashboards`. The default dashboard highlights request volume, latency, success ratios, and recent error logs pulled from Loki.

### Metrics quick check

```powershell
curl http://localhost:3001/metrics   # campaign_service
curl http://localhost:3002/metrics   # payment-service
curl http://localhost:3003/metrics   # pledge-service
curl http://localhost:3004/metrics   # user_service
```

### Logs in Loki

Promtail tails the JSON log files under `observability/logs/*.log` (scheduler writes container logs to these bind mounts). Use Grafana's "Explore" tab with the `Loki` datasource and query `{app="campaign-service"}` (or any other label defined in `docker-compose.observability.yml`).

## Scaling strategy

Compose can simulate horizontal scale via `docker compose up --scale pledge-service=3 --scale payment-service=2`. Because services are stateless (state held in MySQL + outbox tables) and event delivery is idempotent, additional replicas can safely share the workload.
