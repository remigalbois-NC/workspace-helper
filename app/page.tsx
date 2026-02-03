"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signOut, signIn } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Bot, User, Sparkles, LogOut, Loader2, MessageSquare, Plus, ShieldCheck, CheckCircle2, Zap, Trash2, Moon, Sun } from "lucide-react";

const WELCOME_MESSAGE = "Bonjour ! Je suis ton **Expert Workspace**. Comment puis-je optimiser ton travail aujourd'hui ?";

interface Message {
  role: "user" | "bot";
  content: string;
}

interface Discussion {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

const STORAGE_KEY = "workspace-helper-discussions";
const DARK_MODE_KEY = "workspace-helper-dark-mode";

function createNewDiscussion(): Discussion {
  return {
    id: crypto.randomUUID(),
    title: "Nouvelle discussion",
    messages: [{ role: "bot", content: WELCOME_MESSAGE }],
    createdAt: Date.now(),
  };
}

function loadDiscussionsFromStorage(): Discussion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Discussion[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDiscussionsToStorage(discussions: Discussion[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(discussions));
  } catch {
    // ignore
  }
}

function loadDarkModePreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const saved = localStorage.getItem(DARK_MODE_KEY);
    return saved === "true";
  } catch {
    return false;
  }
}

function saveDarkModePreference(isDark: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DARK_MODE_KEY, String(isDark));
  } catch {
    // ignore
  }
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [input, setInput] = useState("");
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [activeDiscussionId, setActiveDiscussionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [hoveredDiscussionId, setHoveredDiscussionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousStatusRef = useRef<string | null>(null);

  // Charger le mode sombre au démarrage
  useEffect(() => {
    const savedDarkMode = loadDarkModePreference();
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Appliquer/retirer le mode sombre
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    saveDarkModePreference(darkMode);
  }, [darkMode]);

  // Charger les discussions depuis le localStorage au démarrage
  useEffect(() => {
    if (status === "authenticated" && !hydrated) {
      // Charger les discussions depuis le localStorage
      const savedDiscussions = loadDiscussionsFromStorage();
      
      if (savedDiscussions.length > 0) {
        // Restaurer les discussions sauvegardées
        setDiscussions(savedDiscussions);
        // Sélectionner la première discussion ou la dernière active
        setActiveDiscussionId(savedDiscussions[0].id);
      } else {
        // Si aucune discussion n'existe, créer une nouvelle discussion
        const first = createNewDiscussion();
        setDiscussions([first]);
        setActiveDiscussionId(first.id);
      }
      
      setHydrated(true);
      previousStatusRef.current = "authenticated";
    } else if (status === "unauthenticated") {
      // Réinitialiser complètement lors de la déconnexion
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }
      previousStatusRef.current = "unauthenticated";
      setDiscussions([]);
      setActiveDiscussionId(null);
      setHydrated(false);
    } else if (status === "loading") {
      previousStatusRef.current = status;
    }
  }, [status, hydrated]);

  // Persist discussions when they change (after hydration)
  useEffect(() => {
    if (status !== "authenticated" || !hydrated || discussions.length === 0) return;
    saveDiscussionsToStorage(discussions);
  }, [status, hydrated, discussions]);

  const activeDiscussion = discussions.find((d) => d.id === activeDiscussionId) ?? null;
  const messages = activeDiscussion?.messages ?? [];

  useEffect(() => {
    if (status === "authenticated") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, status]);

  const handleNewChat = useCallback(() => {
    const newDisc = createNewDiscussion();
    setDiscussions((prev) => {
      const withUpdatedTitle = prev.map((d) => {
        if (d.id !== activeDiscussionId) return d;
        const firstUser = d.messages.find((m) => m.role === "user");
        if (!firstUser || d.title !== "Nouvelle discussion") return d;
        const newTitle =
          (firstUser.content.slice(0, 50).trim() || "Nouvelle discussion") +
          (firstUser.content.length > 50 ? "…" : "");
        return { ...d, title: newTitle };
      });
      return [newDisc, ...withUpdatedTitle];
    });
    setActiveDiscussionId(newDisc.id);
  }, [activeDiscussionId]);

  const handleSelectDiscussion = useCallback((id: string) => {
    setActiveDiscussionId(id);
  }, []);

  const handleDeleteDiscussion = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la sélection de la discussion
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette discussion ?")) {
      setDiscussions((prev) => {
        const filtered = prev.filter((d) => d.id !== id);
        // Si on supprime la discussion active, sélectionner une autre ou créer une nouvelle
        if (activeDiscussionId === id) {
          if (filtered.length > 0) {
            setActiveDiscussionId(filtered[0].id);
          } else {
            const newDisc = createNewDiscussion();
            setActiveDiscussionId(newDisc.id);
            return [newDisc];
          }
        }
        return filtered;
      });
    }
  }, [activeDiscussionId]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  // Afficher la page de login si l'utilisateur n'est pas connecté
  if (status === "unauthenticated") {
    return (
      <div className="auth-wrapper">
        <div className="auth-panel-left">
          <div className="auth-brand">
            <div className="auth-logo">
              <Bot size={28} strokeWidth={2.5} />
            </div>
            <h1 className="auth-product-name">Workspace Helper</h1>
            <p className="auth-product-tagline">
              Votre assistant expert Google Workspace, par Numericoach.
            </p>
            <ul className="auth-features">
              <li>
                <CheckCircle2 size={20} />
                <span>Conseils et astuces sur Google Workspace</span>
              </li>
              <li>
                <MessageSquare size={20} />
                <span>Réponses structurées et bonnes pratiques</span>
              </li>
              <li>
                <Zap size={20} />
                <span>Propulsé par l'IA Gemini, rapide et fiable</span>
              </li>
              <li>
                <ShieldCheck size={20} />
                <span>Connexion sécurisée avec votre compte Google</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="auth-panel-right">
          <div className="auth-card">
            <div className="auth-header">
              <h1 className="auth-title">Connexion</h1>
              <p className="auth-subtitle">
                Connectez-vous avec votre compte Google pour accéder à votre assistant{" "}
                <span className="highlight">Workspace</span>.
              </p>
            </div>

            <div className="auth-body">
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="btn-google"
              >
                <svg className="google-svg" viewBox="0 0 24 24" aria-hidden>
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Continuer avec Google</span>
              </button>
            </div>

            <div className="auth-footer">
              <div className="security-note">
                <ShieldCheck size={16} />
                <span>Connexion sécurisée via Google OAuth</span>
              </div>
              <p className="help-text">
                Besoin d'aide ? <a href="/support">Contacter le support</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input;
    setInput("");

    let currentId = activeDiscussionId;
    if (!currentId) {
      const newDisc = createNewDiscussion();
      setDiscussions((prev) => [newDisc, ...prev]);
      setActiveDiscussionId(newDisc.id);
      currentId = newDisc.id;
    }

    const historyForApi = activeDiscussion
      ? activeDiscussion.messages.slice(1).filter((m) => m.role === "user" || m.role === "bot")
      : [];
    const messagesWithUser = [
      ...(activeDiscussion?.messages ?? [{ role: "bot" as const, content: WELCOME_MESSAGE }]),
      { role: "user" as const, content: userMsg },
    ];

    setDiscussions((prev) =>
      prev.map((d) =>
        d.id === currentId
          ? {
              ...d,
              title:
                d.title === "Nouvelle discussion" && !d.messages.some((m) => m.role === "user")
                  ? userMsg.slice(0, 50).trim() + (userMsg.length > 50 ? "…" : "") || "Nouvelle discussion"
                  : d.title,
              messages: [...d.messages, { role: "user", content: userMsg }],
            }
          : d
      )
    );
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: historyForApi,
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      const appendChunk = (current: string, next: string) => {
        if (!next) return current;
        if (!current) return next;
        const endsWithLetter = /[a-zA-Zàâäéèêëïîôùûüç0-9]$/u.test(current);
        const startsWithLetter = /^[a-zA-Zàâäéèêëïîôùûüç0-9]/u.test(next);
        if (endsWithLetter && startsWithLetter) return current + " " + next;
        return current + next;
      };

      const parseSSEEvent = (raw: string): { event: string; data: string } | null => {
        let event = "message";
        const dataLines: string[] = [];
        for (const line of raw.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^\s/, ""));
        }
        if (dataLines.length === 0) return null;
        return { event, data: dataLines.join("\n").trim() };
      };

      setDiscussions((prev) =>
        prev.map((d) => (d.id === currentId ? { ...d, messages: [...d.messages, { role: "bot", content: "" }] } : d))
      );

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const raw of events) {
          if (!raw.trim()) continue;
          const parsed = parseSSEEvent(raw);
          if (!parsed) continue;

          try {
            if (parsed.data === "[DONE]") {
              setIsLoading(false);
              return;
            }
            const payload = JSON.parse(parsed.data) as { text?: string; message?: string };
            if (parsed.event === "chunk" && typeof payload.text === "string") {
              fullText = appendChunk(fullText, payload.text);
              setDiscussions((prev) =>
                prev.map((d) => {
                  if (d.id !== currentId) return d;
                  const next = [...d.messages];
                  const last = next[next.length - 1];
                  if (last?.role === "bot") next[next.length - 1] = { ...last, content: fullText };
                  return { ...d, messages: next };
                })
              );
            } else if (parsed.event === "done") {
              setIsLoading(false);
              return;
            } else if (parsed.event === "error" && payload.message) {
              setDiscussions((prev) =>
                prev.map((d) =>
                  d.id === currentId
                    ? { ...d, messages: [...d.messages, { role: "bot", content: `⚠️ ${payload.message}` }] }
                    : d
                )
              );
              setIsLoading(false);
              return;
            }
          } catch {
            if (parsed.event === "message" || parsed.event === "chunk") {
              fullText = appendChunk(fullText, parsed.data);
              setDiscussions((prev) =>
                prev.map((d) => {
                  if (d.id !== currentId) return d;
                  const next = [...d.messages];
                  const last = next[next.length - 1];
                  if (last?.role === "bot") next[next.length - 1] = { ...last, content: fullText };
                  return { ...d, messages: next };
                })
              );
            }
          }
        }
      }

      if (buffer.trim()) {
        const parsed = parseSSEEvent(buffer);
        if (parsed?.event === "chunk") {
          try {
            const payload = JSON.parse(parsed.data) as { text?: string };
            if (typeof payload.text === "string") fullText = appendChunk(fullText, payload.text);
          } catch {
            // ignore
          }
        }
      }
      setIsLoading(false);
      setDiscussions((prev) =>
        prev.map((d) => {
          if (d.id !== currentId) return d;
          const next = [...d.messages];
          const last = next[next.length - 1];
          if (last?.role === "bot") next[next.length - 1] = { ...last, content: fullText };
          return { ...d, messages: next };
        })
      );
    } catch {
      setDiscussions((prev) =>
        prev.map((d) =>
          d.id === currentId
            ? { ...d, messages: [...d.messages, { role: "bot", content: "⚠️ Erreur de connexion au serveur." }] }
            : d
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Styles pour le mode sombre
  const sidebarBg = darkMode ? "#0f172a" : "#0f172a";
  const sidebarBorder = darkMode ? "#1e293b" : "#1e293b";
  const sidebarHover = darkMode ? "#1e293b" : "#1e293b";
  const sidebarActive = darkMode ? "#1e293b" : "#1e293b";
  const sidebarText = darkMode ? "#f1f5f9" : "#f1f5f9";
  const sidebarTextSecondary = darkMode ? "#94a3b8" : "#94a3b8";
  const mainBg = darkMode ? "#0f172a" : "#fff";
  const headerBg = darkMode ? "rgba(15, 23, 42, 0.8)" : "rgba(255,255,255,0.8)";
  const headerBorder = darkMode ? "#1e293b" : "#f1f5f9";
  const headerText = darkMode ? "#f1f5f9" : "#0f172a";
  const inputBg = darkMode ? "#1e293b" : "#fff";
  const inputBorder = darkMode ? "#334155" : "#e2e8f0";
  const inputText = darkMode ? "#f1f5f9" : "#1e293b";
  const messageBotBg = darkMode ? "#1e293b" : "#fff";
  const messageBotBorder = darkMode ? "#334155" : "#f1f5f9";
  const messageBotText = darkMode ? "#f1f5f9" : "#1e293b";
  const messageUserBg = darkMode ? "#2563eb" : "#2563eb";
  const messageUserText = darkMode ? "#fff" : "#fff";

  if (status !== "authenticated" || !hydrated) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: darkMode ? "#0f172a" : "#fff",
        }}
      >
        <Loader2 className="animate-spin" size={40} color="#1a73e8" />
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        backgroundColor: mainBg,
        overflow: "hidden",
        fontFamily: "Inter, system-ui, sans-serif",
        color: darkMode ? "#f1f5f9" : "#1e293b",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: "300px",
          backgroundColor: sidebarBg,
          color: sidebarText,
          display: "flex",
          flexDirection: "column",
          borderRight: `1px solid ${sidebarBorder}`,
        }}
      >
        <div style={{ padding: "24px" }}>
          <button
            onClick={handleNewChat}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "12px",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "600",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#1d4ed8")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#2563eb")}
          >
            <Plus size={18} /> Nouveau Chat
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
          <p
            style={{
              fontSize: "11px",
              fontWeight: "800",
              color: "#64748b",
              letterSpacing: "0.05em",
              marginBottom: "16px",
              paddingLeft: "8px",
            }}
          >
            DISCUSSIONS
          </p>
          {discussions.map((d) => (
            <div
              key={d.id}
              onClick={() => handleSelectDiscussion(d.id)}
              onMouseEnter={() => setHoveredDiscussionId(d.id)}
              onMouseLeave={() => setHoveredDiscussionId(null)}
              style={{
                padding: "12px",
                borderRadius: "10px",
                marginBottom: "8px",
                cursor: "pointer",
                backgroundColor: d.id === activeDiscussionId ? sidebarActive : "transparent",
                border: `1px solid ${d.id === activeDiscussionId ? "#334155" : "transparent"}`,
                transition: "background 0.2s",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: sidebarTextSecondary,
                  fontSize: "12px",
                  marginBottom: "4px",
                }}
              >
                <MessageSquare size={12} />
                <span>
                  {new Date(d.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    color: sidebarText,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    lineHeight: "1.5",
                    flex: 1,
                  }}
                >
                  {d.title}
                </div>
                {(hoveredDiscussionId === d.id || d.id === activeDiscussionId) && (
                  <button
                    onClick={(e) => handleDeleteDiscussion(d.id, e)}
                    style={{
                      padding: "4px",
                      backgroundColor: "transparent",
                      border: "none",
                      color: sidebarTextSecondary,
                      cursor: "pointer",
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s",
                      flexShrink: 0,
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
                      e.currentTarget.style.color = "#ef4444";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = sidebarTextSecondary;
                    }}
                    title="Supprimer cette discussion"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "20px", borderTop: `1px solid ${sidebarBorder}`, backgroundColor: darkMode ? "#020617" : "#020617" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", fontWeight: "500" }}>{session?.user?.name}</span>
            <LogOut size={16} style={{ cursor: "pointer", color: sidebarTextSecondary }} onClick={() => signOut({ callbackUrl: "/login" })} />
          </div>
        </div>
      </aside>

      {/* ZONE DE CHAT */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
        <header
          style={{
            height: "70px",
            borderBottom: `1px solid ${headerBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 32px",
            backgroundColor: headerBg,
            backdropFilter: "blur(10px)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ backgroundColor: darkMode ? "#1e293b" : "#eff6ff", padding: "8px", borderRadius: "10px" }}>
              <Bot color={darkMode ? "#60a5fa" : "#2563eb"} size={24} />
            </div>
            <h1 style={{ fontSize: "18px", fontWeight: "700", color: headerText }}>Workspace Helper</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={toggleDarkMode}
              style={{
                padding: "8px",
                backgroundColor: darkMode ? "#1e293b" : "#f8fafc",
                border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`,
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = darkMode ? "#334155" : "#f1f5f9";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = darkMode ? "#1e293b" : "#f8fafc";
              }}
              title={darkMode ? "Activer le mode clair" : "Activer le mode sombre"}
            >
              {darkMode ? <Sun size={18} color="#fbbf24" /> : <Moon size={18} color="#475569" />}
            </button>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: darkMode ? "#1e293b" : "#f8fafc",
                padding: "6px 12px",
                borderRadius: "20px",
                border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`,
              }}
            >
              <Sparkles size={14} color="#f59e0b" />
              <span style={{ fontSize: "12px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#475569" }}>Gemini 2.0 Flash</span>
            </div>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "40px 0", backgroundColor: darkMode ? "#0f172a" : "#fff" }}>
          <div style={{ maxWidth: "850px", margin: "0 auto", padding: "0 24px" }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: "32px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: m.role === "user" ? "row-reverse" : "row",
                    gap: "16px",
                    maxWidth: "85%",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      backgroundColor: darkMode ? (m.role === "bot" ? "#1e293b" : "#334155") : (m.role === "bot" ? "#eff6ff" : "#f8fafc"),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`,
                    }}
                  >
                    {m.role === "bot" ? <Bot size={20} color={darkMode ? "#60a5fa" : "#2563eb"} /> : <User size={20} color={darkMode ? "#94a3b8" : "#64748b"} />}
                  </div>
                  <div
                    style={{
                      backgroundColor: m.role === "user" ? messageUserBg : messageBotBg,
                      color: m.role === "user" ? messageUserText : messageBotText,
                      padding: "16px 20px",
                      borderRadius: "18px",
                      border: m.role === "bot" ? `1px solid ${messageBotBorder}` : "none",
                      boxShadow: m.role === "bot" ? (darkMode ? "0 4px 6px -1px rgba(0,0,0,0.3)" : "0 4px 6px -1px rgba(0,0,0,0.05)") : "none",
                    }}
                  >
                    <div style={{ fontSize: "15px", lineHeight: "1.65" }} className="markdown-content">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => (
                            <p style={{ margin: "0 0 0.75em", color: "inherit", lineHeight: 1.65 }}>{children}</p>
                          ),
                          h2: ({ children }) => (
                            <h2
                              style={{
                                margin: "1.25em 0 0.5em",
                                paddingBottom: "4px",
                                fontSize: "1.05em",
                                fontWeight: 700,
                                color: "inherit",
                                borderBottom: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`,
                              }}
                            >
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3
                              style={{
                                margin: "1em 0 0.4em",
                                fontSize: "1em",
                                fontWeight: 600,
                                color: "inherit",
                              }}
                            >
                              {children}
                            </h3>
                          ),
                          ul: ({ children }) => (
                            <ul style={{ margin: "0 0 0.75em", paddingLeft: "1.25em", color: "inherit" }}>{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol style={{ margin: "0 0 0.75em", paddingLeft: "1.25em", color: "inherit" }}>{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li style={{ marginBottom: "0.35em", color: "inherit" }}>{children}</li>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote
                              style={{
                                margin: "0.75em 0",
                                paddingLeft: "1em",
                                borderLeft: `4px solid ${darkMode ? "#60a5fa" : "#2563eb"}`,
                                opacity: 0.95,
                                color: "inherit",
                              }}
                            >
                              {children}
                            </blockquote>
                          ),
                          code: ({ className, children, ...props }) =>
                            className ? (
                              <code
                                className={className}
                                style={{
                                  padding: "0.2em 0.4em",
                                  borderRadius: "4px",
                                  backgroundColor: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                                  fontSize: "0.9em",
                                }}
                                {...props}
                              >
                                {children}
                              </code>
                            ) : (
                              <code
                                style={{
                                  padding: "0.2em 0.4em",
                                  borderRadius: "4px",
                                  backgroundColor: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                                  fontSize: "0.9em",
                                }}
                                {...props}
                              >
                                {children}
                              </code>
                            ),
                          pre: ({ children }) => (
                            <pre
                              style={{
                                margin: "0.75em 0",
                                padding: "12px",
                                borderRadius: "8px",
                                overflow: "auto",
                                backgroundColor: darkMode ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.06)",
                                fontSize: "0.9em",
                              }}
                            >
                              {children}
                            </pre>
                          ),
                          strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: "flex", gap: "16px", marginBottom: "32px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    backgroundColor: darkMode ? "#1e293b" : "#eff6ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Bot size={20} color={darkMode ? "#60a5fa" : "#2563eb"} className="animate-pulse" />
                </div>
                <div
                  style={{
                    backgroundColor: darkMode ? "#1e293b" : "#f8fafc",
                    padding: "16px",
                    borderRadius: "18px",
                    color: "#94a3b8",
                    fontSize: "14px",
                  }}
                >
                  Analyse en cours...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div style={{ padding: "24px 32px", borderTop: `1px solid ${headerBorder}`, backgroundColor: darkMode ? "#0f172a" : "#fff" }}>
          <div
            style={{
              maxWidth: "850px",
              margin: "0 auto",
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Posez une question sur Google Sheets, Docs ou Gmail..."
              style={{
                width: "100%",
                padding: "18px 60px 18px 24px",
                borderRadius: "16px",
                border: `1px solid ${inputBorder}`,
                backgroundColor: inputBg,
                color: inputText,
                fontSize: "15px",
                outline: "none",
                boxShadow: darkMode ? "0 10px 15px -3px rgba(0,0,0,0.3)" : "0 10px 15px -3px rgba(0,0,0,0.05)",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
              onBlur={(e) => (e.currentTarget.style.borderColor = inputBorder)}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              style={{
                position: "absolute",
                right: "12px",
                padding: "10px",
                backgroundColor: input.trim() ? "#2563eb" : (darkMode ? "#334155" : "#f1f5f9"),
                color: input.trim() ? "#fff" : (darkMode ? "#64748b" : "#cbd5e1"),
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <Send size={20} />
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: "11px", color: darkMode ? "#64748b" : "#94a3b8", marginTop: "16px" }}>
            Propulsé par Numericoach & Gemini 2.0 • 2026
          </p>
        </div>
      </main>
    </div>
  );
}
