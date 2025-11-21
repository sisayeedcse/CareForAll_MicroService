# Pledge Frontend

Vite + React frontend for pledge flows. API calls use `/api/pledges` which the gateway proxies to the pledge service.

Quick start:

```powershell
cd frontend\pledge-frontend
npm install
npm run dev
```

Build with Docker:

```powershell
docker build -t pledge-frontend:local .
docker run --rm -p 30012:80 pledge-frontend:local
```
