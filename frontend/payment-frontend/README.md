# Payment Frontend

Vite + React frontend for payment flows. API calls use `/api/payments` which the gateway proxies to the payment service.

Quick start:

```powershell
cd frontend\payment-frontend
npm install
npm run dev
```

Build with Docker:

```powershell
docker build -t payment-frontend:local .
docker run --rm -p 30013:80 payment-frontend:local
```
