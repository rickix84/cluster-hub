"use client";

import React, { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  Trash2,
  Send,
  Bot,
  User as UserIcon,
  AlertCircle,
  Loader2,
  MessageSquare,
  PlugZap,
  Key,
  LogIn,
  LogOut,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@radix-ui/react-alert-dialog";
import { useAuthStore } from "../lib/auth";
import { fetchModels, sendChat, deleteModel, checkHealth } from "../lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ModelItem {
  id: string;
  object?: string;
  owned_by?: string;
  [key: string]: unknown;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ModelList({
  models,
  selectedId,
  onSelect,
  onDelete,
}: {
  models: ModelItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
        <PlugZap className="h-8 w-8 opacity-50" />
        <p className="text-sm">Nessun modello disponibile</p>
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      {models.map((m) => {
        const selected = m.id === selectedId;
        return (
          <li key={m.id}>
            <div
              className={`group flex items-center justify-between rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-accent hover:text-accent-foreground"
              }`}
              onClick={() => onSelect(m.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onSelect(m.id)}
              aria-pressed={selected}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium truncate">{m.id}</span>
                {m.owned_by && (
                  <span className="text-xs text-muted-foreground">{m.owned_by}</span>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(m.id);
                }}
                className="ml-2 rounded p-1 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus:opacity-100"
                aria-label={`Elimina modello ${m.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ChatPanel({
  model,
  messages,
  input,
  onInput,
  onSend,
  loading,
  error,
  onClear,
}: {
  model: string;
  messages: ChatMessage[];
  input: string;
  onInput: (v: string) => void;
  onSend: () => void;
  loading: boolean;
  error: string | null;
  onClear: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, bottomRef]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  if (!model) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <MessageSquare className="h-10 w-10 opacity-40" />
        <p className="text-sm text-center max-w-xs">
          Seleziona un modello dalla lista per iniziare la chat
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium truncate max-w-[260px]">{model}</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancella
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Invia un messaggio per iniziare
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 ${msg.role === "user" ? "justify-end" : ""}`}
          >
            {msg.role !== "user" && (
              <div className="shrink-0 mt-0.5">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div
              className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-accent-foreground"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="shrink-0 mt-0.5">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-start gap-2">
            <div className="shrink-0 mt-0.5">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="rounded-lg px-3 py-2 bg-accent text-accent-foreground text-sm flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Risposta in corso…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="border-t p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => onInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Scrivi un messaggio…"
            disabled={loading}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50 focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
          <button
            onClick={onSend}
            disabled={loading || !input.trim()}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span className="sr-only sm:not-sr-only">Invia</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Token input component ───────────────────────────────────────────────────

function TokenInput({
  onAuthChange,
}: {
  onAuthChange: (authenticated: boolean) => void;
}) {
  const [tokenInput, setTokenInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const { token, setToken, clearToken, maskedToken } = useAuthStore();

  const handleSetToken = () => {
    const trimmed = tokenInput.trim();
    if (trimmed) {
      setToken(trimmed);
      onAuthChange(true);
    }
  };

  const handleLogout = () => {
    clearToken();
    setTokenInput("");
    onAuthChange(false);
  };

  if (!token) {
    return (
      <div className="flex items-center gap-2">
        <Key className="h-4 w-4 text-muted-foreground" />
        <input
          type="password"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder="Inserisci token JWT…"
          className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/40 focus:border-primary w-48"
        />
        <button
          onClick={handleSetToken}
          disabled={!tokenInput.trim()}
          className="h-8 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1"
        >
          <LogIn className="h-3 w-3" />
          <span className="sr-only sm:not-sr-only">Autentica</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Key className="h-4 w-4 text-primary" />
      <span className="text-xs font-mono text-muted-foreground">
        {showToken ? token : maskedToken()}
      </span>
      <button
        onClick={() => setShowToken((v) => !v)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        aria-label={showToken ? "Nascondi token" : "Mostra token"}
      >
        {showToken ? "Nascondi" : "Mostra"}
      </button>
      <button
        onClick={handleLogout}
        className="h-8 rounded-md border border-input px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-1"
        aria-label="Esci"
      >
        <LogOut className="h-3 w-3" />
        <span className="sr-only sm:not-sr-only">Esci</span>
      </button>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function Home() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useAuthStore();

  const handleAuthError = (err: Error) => {
    if (err.message.includes("Unauthorized")) {
      setAuthError("Token non valido o scaduto. Inserisci un nuovo token.");
    }
  };

  const { data: models, isLoading, error, refetch } = useQuery({
    queryKey: ["models"],
    queryFn: fetchModels,
    enabled: isAuthenticated,
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      if (selectedId === deleteTarget) {
        setSelectedId(null);
        setMessages([]);
      }
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      handleAuthError(err);
      if (!err.message.includes("Unauthorized")) {
        alert(`Errore nell'eliminazione: ${err.message}`);
      }
      setDeleteTarget(null);
    },
  });

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMessages([]);
    setChatError(null);
  };

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget);
  };

  const handleSend = async () => {
    if (!selectedId || !input.trim() || chatLoading) return;
    const userMsg: ChatMessage = { role: "user", content: input };
    const prevInput = input;
    setInput("");
    setChatError(null);
    setMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const reply = await sendChat(selectedId, [...messages, userMsg]);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Errore sconosciuto";
      handleAuthError(err instanceof Error ? err : new Error(msg));
      if (!msg.includes("Unauthorized")) {
        setChatError(msg);
      }
      setMessages((prev) => prev.filter((m) => m.content !== prevInput));
    } finally {
      setChatLoading(false);
    }
  };

  // Check health on mount (public endpoint)
  useEffect(() => {
    checkHealth().catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b px-6 py-3 flex items-center justify-between bg-background sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <PlugZap className="h-5 w-5 text-primary" />
            <h1 className="text-base font-semibold tracking-tight">Cluster Hub</h1>
            <span className="text-xs text-muted-foreground hidden sm:inline">LocalAI POC</span>
          </div>
          <TokenInput onAuthChange={setIsAuthenticated} />
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading || !isAuthenticated}
          className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Aggiorna
        </button>
      </header>

      {/* Auth error banner */}
      {authError && (
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{authError}</span>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Models panel */}
        <aside className="w-full sm:w-80 md:w-96 border-r flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="text-sm font-medium">Modelli</h2>
            {!isAuthenticated && (
              <p className="text-xs text-muted-foreground mt-1">
                Inserisci il token JWT per continuare
              </p>
            )}
            {isLoading && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Caricamento…
              </p>
            )}
            {error && !authError && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error instanceof Error ? error.message : String(error)}
              </p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {!isAuthenticated ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Key className="h-8 w-8 opacity-50" />
                <p className="text-sm text-center">Autenticati per vedere i modelli</p>
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin opacity-50" />
                <p className="text-sm">Caricamento modelli…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-2 py-12 text-destructive">
                <AlertCircle className="h-8 w-8 opacity-50" />
                <p className="text-sm text-center">Errore nel caricamento</p>
                <button
                  onClick={() => refetch()}
                  className="text-xs underline hover:no-underline"
                >
                  Riprova
                </button>
              </div>
            ) : (
              <ModelList
                models={(models as ModelItem[]) ?? []}
                selectedId={selectedId}
                onSelect={handleSelect}
                onDelete={handleDelete}
              />
            )}
          </div>
        </aside>

        {/* Chat panel */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <ChatPanel
            model={selectedId ?? ""}
            messages={messages}
            input={input}
            onInput={setInput}
            onSend={handleSend}
            loading={chatLoading}
            error={chatError}
            onClear={() => {
              setMessages([]);
              setChatError(null);
            }}
          />
        </main>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <div>
            <AlertDialogTitle>Elimina modello</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il modello{" "}
              <span className="font-mono font-semibold">{deleteTarget}</span>? Questa azione non
              può essere annullata.
            </AlertDialogDescription>
          </div>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
