# Cluster Hub

Dashboard unificata per il monitoraggio e la gestione di tutti i componenti del cluster:

- **LocalAI** — gestione modelli e inferenza
- **Prometheus** — metriche e alerting
- **Grafana** — visualizzazione dashboard
- **Portainer** — gestione container
- **OpenClaw Agent** — chat e assistente conversazionale
- **Knowledge Base** — sistema di memoria persistente

## Struttura

```
cluster-hub/
├── docs/
│   ├── architecture.md          # Architettura dettagliata
│   ├── api-integrations.md      # Integrazioni API per ogni componente
│   ├── components/              # Documentazione per componente
│   │   ├── localai.md
│   │   ├── prometheus.md
│   │   ├── grafana.md
│   │   ├── portainer.md
│   │   └── openclaw.md
│   └── paths.md                 # Percorsi documentazioni ufficiali (da compilare)
├── src/
│   ├── core/                    # Logica comune, orchestrazione
│   ├── integrations/            # Adattatori per ogni sistema
│   ├── ui/                      # Frontend (da definire)
│   └── monitoring/              # Alerting, health checks
├── docker/                      # Configurazioni Docker/Compose
└── tests/
```

## Stato

- [x] Repository creato
- [ ] Documentazione percorsi ufficiali compilata
- [ ] Analisi API disponibili per ogni componente
- [ ] Architettura frontend definita
- [ ] POC di integrazione LocalAI API
- [ ] POC di integrazione Portainer API
- [ ] POC di integrazione Grafana API
- [ ] POC di integrazione Prometheus API
- [ ] POC di integrazione OpenClaw API
- [ ] Knowledge base design
- [ ] Infrastruttura Docker/Compose
