# Cluster Hub

## Struttura

```
cluster-hub/
├── docs/
│   ├── architecture.md
│   ├── api-integrations.md
│   ├── frontend-design.md
│   └── paths.md
├── frontend/          # Next.js 15 + React 19 + TypeScript
│   ├── src/
│   │   ├── app/       # App Router
│   │   ├── components/ # UI Components
│   │   └── stores/    # Zustand stores
│   └── package.json
├── backend/           # Fastify server (da creare)
│   └── src/
│       └── integrations/
└── README.md
```

## Stack Tecnologico

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: shadcn/ui + TailwindCSS
- **State**: Zustand
- **HTTP**: TanStack Query
- **Charts**: Recharts
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js 22
- **Framework**: Fastify
- **Auth**: JWT

## POC LocalAI

### Funzionalità
1. Lista modelli
2. Upload modello
3. Rimuovi modello
4. Chat con modello
5. Status modello

### API Endpoints da Esporre
```
GET    /api/localai/models
POST   /api/localai/models/upload
DELETE /api/localai/models/:id
POST   /api/localai/chat
```
