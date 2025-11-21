# Payment Service

Node.js microservice that processes pledge and campaign payments for CareForAll.

## Features

- Express.js API with JWT protection for payment creation.
- MySQL database auto-provisioning (creates `payment_service` DB and `payments` table on boot).
- Stripe PaymentIntent integration with idempotency keys to prevent duplicate charges.
- Stripe webhook endpoint to reconcile payment status updates.

## Project Structure

```
payment-service/
├─ server.js
├─ package.json
├─ .env
├─ config/
│  └─ db.js
├─ controllers/
│  └─ paymentController.js
├─ middleware/
│  └─ authMiddleware.js
└─ routes/
	 └─ paymentRoutes.js
```

## Environment Variables (`.env`)

```
PORT=3004
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=payment_service
JWT_SECRET=yourjwtsecret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

Use the same `JWT_SECRET` value as `user_service` so issued tokens validate consistently.

## Getting Started

```bash
cd services/payment-service
npm install
npm run dev
```

The service will provision the database/table automatically and start on port 3004.

## API Endpoints

### POST /payments/charge

- **Headers**: `Authorization: Bearer <JWT>`, `Content-Type: application/json`
- **Body**:
  ```json
  {
    "amount": 199.99,
    "pledgeId": 12,
    "campaignId": 7
  }
  ```
- **Behavior**:
  - Requires a valid JWT (decoded via `authMiddleware`).
  - Creates a payment row with `PENDING` status, then calls Stripe.
  - Uses idempotency key `payment-<user>-<pledge>-<campaign>` and Stripe's idempotent API to prevent duplicate charges.
  - Updates the record to `SUCCESS` or `FAILED`. Response includes `{ status, transactionId, paymentId }`.

### POST /payments/webhook

- **Headers**: `Stripe-Signature: <signature from Stripe>`
- **Body**: raw JSON forwarded by Stripe webhooks.
- **Behavior**:
  - Verifies the signature using `STRIPE_WEBHOOK_SECRET`.
  - Accepts `payment_intent.succeeded` and `payment_intent.payment_failed` events.
  - Updates the corresponding payment row (matched via PaymentIntent metadata).
  - Returns `{ "received": true }`.

## Postman / Thunder Client Examples

1. **Charge Request**

   - Method: `POST http://localhost:3004/payments/charge`
   - Headers:
     - `Authorization: Bearer <jwt-from-user-service>`
     - `Content-Type: application/json`
   - Body:
     ```json
     {
       "amount": 50,
       "pledgeId": 101,
       "campaignId": 33
     }
     ```

2. **Stripe Webhook Test**
   - Method: `POST http://localhost:3004/payments/webhook`
   - Headers: `Stripe-Signature` from Stripe CLI (`stripe listen --forward-to localhost:3004/payments/webhook`).
   - Body: Provided by Stripe CLI, no manual JSON needed.

## Notes on Idempotency & Retries

- Re-using the same `pledgeId/campaignId + userId` combination returns the existing payment if it already succeeded.
- Stripe idempotency keys guard against network retries or double submissions.
- Webhook handler is idempotent: repeated events simply re-apply the same status.

## Run Stripe Webhook Locally

```bash
stripe listen --forward-to localhost:3004/payments/webhook
```

Use the webhook secret from the CLI output to populate `STRIPE_WEBHOOK_SECRET`.
