# User Frontend

Vite + React frontend for user auth and profile pages. API calls go to `/api` which the gateway proxies to the user service.

Quick start:

```powershell
cd frontend\user-frontend
npm install
npm run dev
```

Build with Docker:

```powershell
docker build -t user-frontend:local .
docker run --rm -p 30011:80 user-frontend:local
```
