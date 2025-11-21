# Campaign Frontend

This is a small Vite + React frontend for the Campaign service. It expects the API gateway to proxy `/api/campaigns` to the campaign backend.

Quick start (locally):

1. Install dependencies:

```powershell
cd frontend\campaign-frontend
npm install
```

2. Dev server:

```powershell
npm run dev
```

3. Build and run with Docker (recommended for running inside the compose network):

```powershell
docker build -t campaign-frontend:local .
docker run --rm -p 30010:80 campaign-frontend:local
```

When running under the gateway nginx, place the built files under `/usr/share/nginx/html/campaign` or run this container and configure the gateway to proxy `/campaign/` to it.
