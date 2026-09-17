# Architettura Cluster Hub

## Panoramica

Cluster Hub è un pannello di controllo unificato che integra sei sistemi eterogenei:

```
┌─────────────────────────────────────────────────────────────┐
│                    CLUSTER HUB (Frontend)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ NODI     │  │ LOCALAI  │  │ PROMETHE │  │ GRAFANA  │     │
│  │ CLUSTER  │  │ MODELS   │  │ METRICS  │  │ DASH     │     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘     │
│       │              │             │              │           │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐     │
│  │ PORTAINER│  │  AGENT   │  │ KNOWLEDGE│  │  ALERTS  │     │
│  │CONTAINERS│  │ OPENCLAW │  │  BASE    │  │  ENGINE  │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Componenti

### 1. Gestione Nodi Cluster
- **Scopo**: Monitoraggio stato nodi, risorse, salute
- **Sorgenti**: K8s API / Docker Swarm / nodi fisici
- **Metriche**: CPU, RAM, disco, rete, uptime

### 2. LocalAI — Gestione Modelli
- **Scopo**: Caricamento, rimozione, switching modelli
- **API**: REST (OpenAI-compatible)
- **Operazioni**: list models, download, delete, status

### 3. Prometheus — Metriche
- **Scopo**: Raccolta metriche, query, alerting
- **API**: Prometheus HTTP API (query, targets, rules, alerts)
- **Operazioni**: query istantanee, range, alert status

### 4. Grafana — Dashboard
- **Scopo**: Visualizzazione, alerting, notifica
- **API**: Grafana REST API (datasources, dashboards, alerts, users)
- **Operazioni**: query datasource, creare dashboard, gestire alert

### 5. Portainer — Container
- **Scopo**: Gestione container, stack, immagini, volumi
- **API**: Portainer API (containers, images, stacks, volumes)
- **Operazioni**: list/start/stop container, deploy stack, log

### 6. OpenClaw Agent — Chat
- **Scopo**: Assistente conversazionale, automazione
- **API**: OpenClaw sessions/conversations
- **Operazioni**: query, automazioni, risposte contestuali

### 7. Knowledge Base — Memoria
- **Scopo**: Memoria persistente, contesto, RAG
- **Approccio**: Vector DB (es. ChromaDB) + embeddings
- **Operazioni**: query, insert, delete, context retrieval

## Architettura Tecnica

### Backend (Node.js)
- **Framework**: Express/Fastify
- **Orchestratore**: Gestisce chiamate parallele a tutti i sistemi
- **Auth**: JWT per sessioni utente
- **WebSocket**: Aggiornamenti real-time per eventi

### Frontend (da definire — vedi sezione Design)
- **Framework**: React/Vue/Svelte
- **Stato**: Zustand/Redux
- **Comunicazione**: REST + WebSocket

### Data Flow
```
User → Frontend → Backend → [Parallel API calls] → [Aggregate] → Response
```

## Decisioni da Prendere

1. **Stack Frontend**: SPA vs Micro-frontend vs Monolite
2. **Comunicazione**: REST vs GraphQL vs WebSocket-first
3. **Auth**: SSO, LDAP, o locale?
4. **Knowledge Base**: ChromaDB, Milvus, Pinecone?
5. **Deployment**: Docker Compose vs Kubernetes?
