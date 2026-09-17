# Design Architettura Frontend

## Stack Tecnologico

### Frontend
- **Framework**: React 19 con TypeScript
- **UI Library**: shadcn/ui (componenti accessibili, customizzabili, basati su Radix)
- **Styling**: TailwindCSS v4
- **State Management**: Zustand (leggero, no boilerplate)
- **HTTP Client**: TanStack Query (caching, refetch automatico, loading states)
- **WebSocket**: TanStack Query + ws-native per aggiornamenti real-time
- **Routing**: TanStack Router (file-based, type-safe)
- **Charts**: Recharts (grafici Prometheus/Grafana)
- **Table**: TanStack Table (tabella nodi, container, etc.)

### Backend
- **Runtime**: Node.js 22 LTS
- **Framework**: Fastify (performance > Express)
- **TypeScript**: strict mode
- **Auth**: JWT + session management
- **WebSocket**: Fastify WebSocket (real-time alerts, live metrics)
- **API Client**: OpenAPI Generator per i client SDK dai repo swagger

### Infrastruttura
- **Docker Compose** per orchestrazione locale
- **Reverse Proxy**: Caddy o Nginx
- **Cache**: Redis (sessioni, cache query Prometheus/Grafana)

## Architettura a Moduli

Ogni modulo è un **micro-frontend** indipendente, ma con stato condiviso:

```
┌─────────────────────────────────────────────────────────────┐
│                    CLUSTER HUB SPA (React)                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Layout (Sidebar + Header)               │   │
│  │                                                      │   │
│  │  ┌────────┐  ┌─────────────────────────────────────┐  │   │
│  │  │        │  │           Content Area              │  │   │
│  │  │        │  │                                     │  │   │
│  │  │  Nav   │  │  ┌──────────┐  ┌──────────┐        │  │   │
│  │  │        │  │  │ NODI     │  │ LOCALAI  │ ...    │  │   │
│  │  │        │  │  │ Cluster  │  │ Models   │        │  │   │
│  │  │        │  │  └──────────┘  └──────────┘        │  │   │
│  │  │        │  │                                     │  │   │
│  │  │        │  │  ┌──────────┐  ┌──────────┐        │  │   │
│  │  │        │  │  │ PROMETHE │  │ GRAFANA  │        │  │   │
│  │  │        │  │  │ METRICS  │  │ DASH     │        │  │   │
│  │  │        │  │  └──────────┘  └──────────┘        │  │   │
│  │  │        │  │                                     │  │   │
│  │  │        │  │  ┌──────────┐  ┌──────────┐        │  │   │
│  │  │        │  │  │ PORTAINER│  │  AGENT   │        │  │   │
│  │  │        │  │  │CONTAINERS│  │ OPENCLAW │        │  │   │
│  │  │        │  │  └──────────┘  └──────────┘        │  │   │
│  │  │        │  │                                     │  │   │
│  │  │        │  │  ┌──────────┐                       │  │   │
│  │  │        │  │  │ KNOWLEDGE│                       │  │   │
│  │  │        │  │  │  BASE    │                       │  │   │
│  │  │        │  │  └──────────┘                       │  │   │
│  │  │        │  │                                     │  │   │
│  │  └────────┘  └─────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Comunicazione Backend ↔ Frontend

### REST (primary)
- Tutte le operazioni CRUD via REST con TanStack Query
- Automatico: caching, refetch, optimistic updates

### WebSocket (real-time)
- Alert Prometheus/Grafana in tempo reale
- Metriche live (live gauge charts)
- Stato container (start/stop)
- Notifiche OpenClaw agent

### Sincronizzazione Stato

```typescript
// Zustand store globale
const useClusterStore = create((set) => ({
  nodes: [],
  localaiModels: [],
  prometheusAlerts: [],
  portainerContainers: [],
  // ...
}));
```

## Design System

### Palette Colori
- **Primario**: Indigo (moduli principali)
- **Success**: Emerald (nodal healthy, container running)
- **Warning**: Amber (warning, degraded)
- **Danger**: Rose (alerts down, errors)
- **Neutro**: Slate (background, sidebar)

### Componenti Chiave
- **StatusBadge** — badge colore per stato (running, stopped, error, etc.)
- **MetricCard** — card con metrica + sparkline
- **AlertPanel** — pannello alert con severity
- **ModelCard** — card modello LocalAI con peso, dimensione
- **ContainerRow** — riga container con log snippet
- **ChatBubble** — messaggio chat OpenClaw

## POC LocalAI — Specifiche

### Funzionalità
1. **Lista modelli** — `GET /v1/models` → tabella con nome, dimensione, status
2. **Upload modello** — `POST` per aggiungere modello
3. **Rimuovi modello** — `DELETE /v1/models/{id}`
4. **Chat con modello** — `POST /v1/chat/completions` → chat interface
5. **Status modello** — loading, ready, error

### API Endpoints da Esporre
```
GET    /api/localai/models
POST   /api/localai/models/upload
DELETE /api/localai/models/:id
POST   /api/localai/chat
```

### API Endpoints da Integrare
```
GET    https://localai.tail6518ad.ts.net/v1/models
POST   https://localai.tail6518ad.ts.net/v1/chat/completions
DELETE https://localai.tail6518ad.ts.net/v1/models/{id}
```
