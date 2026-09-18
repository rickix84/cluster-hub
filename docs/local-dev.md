# Cluster Hub - Local Development Guide

## Prerequisites

- Node.js 22+
- npm or pnpm
- LocalAI instance running (or configure `LOCALAI_BASE_URL`)

## Quick Start

```bash
# 1. Clone and enter the repository
git clone <repo-url>
cd cluster-hub

# 2. Backend setup
cd backend
cp .env.example .env
# Edit .env and set CLUSTER_HUB_JWT_SECRET to a strong random string
npm install
npm run dev

# 3. Frontend setup (new terminal)
cd ../frontend
cp .env.example .env.local
# Edit .env.local if needed (default points to localhost:3001)
npm install
npm run dev
```

## Environment Variables

### Backend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLUSTER_HUB_JWT_SECRET` | Yes | - | Secret for JWT signing/verification |
| `LOCALAI_BASE_URL` | No | `http://localhost:8080` | Upstream LocalAI service URL |
| `LOCALAI_TIMEOUT_MS` | No | `30000` | Request timeout in milliseconds |
| `CORS_ORIGIN` | No | `*` | CORS allowed origin |
| `PORT` | No | `3001` | Server port |

### Frontend (.env.local)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | No | `http://localhost:3001` | Backend API URL |

## Scripts

### Backend

```bash
npm run dev      # Start development server with hot reload
npm run build    # Compile TypeScript to dist/
npm start        # Start production server
npm test         # Run tests
```

### Frontend

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
npm test         # Run tests
```

## Architecture Notes

- **Browser never calls LocalAI directly**: All requests go through the backend proxy at `/api/localai/*`
- **JWT tokens are in-memory only**: Not stored in localStorage, cookies, or public files
- **Secrets are server-side only**: `CLUSTER_HUB_JWT_SECRET` is never exposed to the browser
- **Health endpoint is public**: `GET /api/health` does not require authentication

## Smoke Test

```bash
# Test health endpoint (no auth required)
curl http://localhost:3001/api/health

# Expected: {"status":"ok","timestamp":"..."}
```

## Security

- Never commit `.env` files (they are in `.gitignore`)
- Use a strong, unique `CLUSTER_HUB_JWT_SECRET` in production
- Set `CORS_ORIGIN` to your actual frontend domain in production
- Tokens are never logged; only error codes are recorded
