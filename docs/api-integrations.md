# Analisi API e Integrazioni

## 1. LocalAI

### API Disponibile
Sì — LocalAI espone un'API REST compatibile con OpenAI.

### Endpoint Principali
- `GET  /v1/models` — Lista modelli disponibili
- `GET  /v1/models/{model_id}` — Dettaglio modello
- `POST /v1/chat/completions` — Chat completamento
- `POST /v1/completions` — Completamento testo
- `POST /v1/embeddings` — Embedding
- `POST /v1/audio/transcriptions` — Trascrizione audio
- `POST /v1/images/generations` — Generazione immagini

### Operazioni di Gestione
- **Download modelli**: tramite API o filesystem (cartella `models`)
- **Rimozione modelli**: `DELETE /v1/models/{model_id}`
- **Status modello**: `GET /v1/models/{model_id}`

### Autenticazione
- Opzionale, via `Authorization: Bearer <token>`
- Configurabile nel file di configurazione

### Documentazione Ufficiale
- [GitHub](https://github.com/mudler/LocalAI)
- [API Reference](https://localai.io/reference/api/)

---

## 2. Prometheus

### API Disponibile
Sì — Prometheus espone un'API HTTP RESTful.

### Endpoint Principali
- `GET  /api/v1/query?query=<expr>` — Query istantanea
- `GET  /api/v1/query_range?query=<expr>&start=<t>&end=<t>&step=<s>` — Query range
- `GET  /api/v1/targets` — Target attivi
- `GET  /api/v1/rules` — Alert rules
- `GET  /api/v1/alerts` — Alert attivi
- `GET  /api/v1/label/<name>/values` — Valori label
- `GET  /api/v1/series?match[]=<selector>` — Series matching

### Autenticazione
- Nessuna di default
- Configurabile con Basic Auth o token

### Documentazione Ufficiale
- [API Docs](https://prometheus.io/docs/prometheus/latest/querying/api/)

---

## 3. Grafana

### API Disponibile
Sì — Grafana espone un'API REST completa.

### Endpoint Principali
- `GET  /api/dashboards/uid/{uid}` — Dashboard
- `POST /api/dashboards/db` — Crea dashboard
- `GET  /api/datasources` — Datasources
- `GET  /api/datasources/{id}` — Datasource dettagli
- `GET  /api/alerting/rules` — Alert rules
- `GET  /api/users` — Utenti
- `GET  /api/org/users` — Utenti organizzazione
- `POST /api/alerting/notifications` — Notifiche
- `GET  /api/folders` — Cartelle

### Autenticazione
- API Key (preferita per automazione)
- Service Account (per automazioni)
- Basic Auth

### Documentazione Ufficiale
- [API Docs](https://grafana.com/docs/grafana/latest/developers/http_api/)

---

## 4. Portainer

### API Disponibile
Sì — Portainer espone un'API REST completa.

### Endpoint Principali
- `GET  /api/endpoints` — Endpoint Docker
- `GET  /api/endpoints/{id}/docker/containers/json` — Container
- `POST /api/endpoints/{id}/docker/containers/create` — Crea container
- `POST /api/endpoints/{id}/docker/containers/{id}/start` — Start container
- `POST /api/endpoints/{id}/docker/containers/{id}/stop` — Stop container
- `DELETE /api/endpoints/{id}/docker/containers/{id}` — Rimuovi container
- `GET  /api/endpoints/{id}/docker/images/json` — Immagini
- `GET  /api/endpoints/{id}/docker/volumes/json` — Volumi
- `GET  /api/endpoints/{id}/docker/stacks/json` — Stack
- `POST /api/endpoints/{id}/docker/stacks/create` — Deploy stack
- `POST /api/endpoints/{id}/docker/stacks/{id}/remove` — Rimuovi stack
- `GET  /api/endpoints/{id}/docker/containers/{id}/logs` — Log container

### Autenticazione
- JWT Token (login via `/api/auth`)
- API Key (per automazione)

### Documentazione Ufficiale
- [API Docs](https://app.swaggerhub.com/apis/portainer/portainer-ce/2.19.1)

---

## 5. OpenClaw

### API Disponibile
Sì — OpenClaw espone API per sessioni e conversazioni.

### Endpoint Principali
- `sessions_send(sessionKey, message)` — Invia messaggio
- `session_status(sessionKey)` — Stato sessione
- `conversations_send(conversationRef, message)` — Invia diretta
- `conversations_turn(conversationRef, message)` — Invia e attendi risposta

### Autenticazione
- Dipende dalla configurazione Gateway

### Documentazione Ufficiale
- [OpenClaw Docs](https://docs.openclaw.ai)

---

## 6. Nodi Cluster

### Opzioni in base al tipo
- **Kubernetes**: kubectl → REST API (`/api/v1/nodes`, `/api/v1/pods`, etc.)
- **Docker Swarm**: Docker Engine API (`/containers/json`, `/swarm/info`)
- **Nodi fisici**: SSH + `top`, `df`, `free`, `uptime`

---

## 7. Knowledge Base

### Opzioni
- **ChromaDB**: Lightweight, Python-based, in-memory o file-backed
- **Milvus**: Scalabile, cloud-ready
- **Pinecone**: Managed, cloud-only
- **Qdrant**: Rust-based, self-hosted

### Operazioni
- `INSERT` — Embedding + testo
- `QUERY` — Similarità vettoriale
- `DELETE` — Rimuovi documenti
- `LIST` — Elenco documenti
