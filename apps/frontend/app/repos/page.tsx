"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

interface Repo { name: string; id?: string; url?: string; cloneUrl?: string; description?: string; createdAt?: string; }
interface Identity { did: string; name?: string; createdAt?: string; }

function timeSince(ts: string | undefined) {
  if (!ts) return "—";
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function ReposPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDesc, setNewRepoDesc] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [reposRes, idRes] = await Promise.allSettled([
        fetch(`${API}/gitlawb/repo/list`, { signal: AbortSignal.timeout(8000) }),
        fetch(`${API}/gitlawb/identity`, { signal: AbortSignal.timeout(8000) }),
      ]);

      if (reposRes.status === "fulfilled" && reposRes.value.ok) {
        const d = await reposRes.value.json();
        const list = d.result?.repos ?? d.repos ?? d.data ?? [];
        setRepos(Array.isArray(list) ? list : []);
      }
      if (idRes.status === "fulfilled" && idRes.value.ok) {
        const d = await idRes.value.json();
        setIdentity(d.identity ?? d.result ?? d);
      }
    } catch {
      setError("Failed to connect to backend");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createRepo = async () => {
    if (!newRepoName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const r = await fetch(`${API}/gitlawb/repo/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRepoName.trim(), description: newRepoDesc.trim() }),
        signal: AbortSignal.timeout(15000),
      });
      const d = await r.json();
      if (d.success !== false) {
        setSuccessMsg(`◈ Repo '${newRepoName}' created`);
        setNewRepoName("");
        setNewRepoDesc("");
        setShowCreate(false);
        await fetchData();
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setError(d.error ?? "Create failed");
      }
    } catch {
      setError("Create failed — check backend connection");
    }
    setCreating(false);
  };

  return (
    <main className="page-wrapper" style={{ padding: "64px 16px 48px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "20px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <p style={{ fontSize: "9px", letterSpacing: "0.3em", color: "rgba(0,255,65,0.35)" }}>BANKRSYNTH://</p>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(16px,3vw,22px)", fontWeight: 700, letterSpacing: "0.2em", color: "var(--green)", textShadow: "0 0 20px rgba(0,255,65,0.4)", marginTop: "4px" }}>
              ◈ GITLAWB — REPO ORCHESTRATION
            </h1>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={fetchData} style={{ fontSize: "9px", padding: "5px 12px", background: "transparent", border: "1px solid rgba(0,255,65,0.2)", color: "rgba(0,255,65,0.5)", cursor: "pointer", letterSpacing: "0.15em" }}>↺ SYNC</button>
            <button onClick={() => setShowCreate((v) => !v)} className="neon-btn" style={{ width: "auto", fontSize: "9px", padding: "5px 14px" }}>
              {showCreate ? "CANCEL" : "+ CREATE REPO"}
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && <div style={{ marginBottom: "12px", padding: "8px 12px", border: "1px solid rgba(255,60,60,0.3)", color: "#ff4466", fontSize: "11px" }}>✗ {error}</div>}
        {successMsg && <div style={{ marginBottom: "12px", padding: "8px 12px", border: "1px solid rgba(0,255,65,0.3)", color: "var(--green)", fontSize: "11px" }}>{successMsg}</div>}

        {/* Identity panel */}
        {identity?.did && (
          <motion.div className="glass-panel" style={{ marginBottom: "16px" }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="corner corner-tl" />
            <div className="panel-title">◈ AGENT IDENTITY — GITLAWB DID</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px", fontSize: "11px" }}>
              <span style={{ color: "rgba(0,255,65,0.45)" }}>DID</span>
              <span style={{ color: "var(--cyan)", wordBreak: "break-all", letterSpacing: "0.05em" }}>{identity.did}</span>
              {identity.name && <><span style={{ color: "rgba(0,255,65,0.45)" }}>NAME</span><span>{identity.name}</span></>}
              {identity.createdAt && <><span style={{ color: "rgba(0,255,65,0.45)" }}>CREATED</span><span style={{ color: "rgba(0,255,65,0.6)" }}>{timeSince(identity.createdAt)}</span></>}
            </div>
          </motion.div>
        )}

        {/* Create repo form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div className="glass-panel" style={{ marginBottom: "16px" }} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
              <div className="corner corner-tl" />
              <div className="panel-title">◈ CREATE REPOSITORY</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <span className="input-label">REPO NAME *</span>
                  <input value={newRepoName} onChange={(e) => setNewRepoName(e.target.value)} placeholder="my-project" className="terminal-input" onKeyDown={(e) => e.key === "Enter" && createRepo()} />
                </div>
                <div>
                  <span className="input-label">DESCRIPTION</span>
                  <input value={newRepoDesc} onChange={(e) => setNewRepoDesc(e.target.value)} placeholder="Optional description" className="terminal-input" />
                </div>
                <button onClick={createRepo} disabled={creating || !newRepoName.trim()} className="neon-btn" style={{ width: "auto", fontSize: "10px", padding: "8px 20px" }}>
                  {creating ? "CREATING…" : "◈ INIT REPOSITORY"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Repos list */}
        {loading ? (
          <div className="glass-panel">
            <div className="corner corner-tl" />
            <div className="panel-title">CONNECTING TO GITLAWB</div>
            <p className="muted" style={{ fontSize: "11px" }}>&gt; fetching repository index…</p>
            <span className="cursor-blink" style={{ color: "var(--green)" }}>_</span>
          </div>
        ) : repos.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: "center", padding: "32px" }}>
            <p style={{ fontSize: "13px", color: "rgba(0,255,65,0.4)", marginBottom: "8px" }}>◈ No repositories found</p>
            <p className="muted" style={{ fontSize: "11px" }}>Create your first GitLawb repo to begin autonomous development</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
            <AnimatePresence>
              {repos.map((repo, i) => (
                <motion.div key={repo.name ?? repo.id ?? i} className="glass-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04 }}>
                  <div className="corner corner-tl" />
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--green)", letterSpacing: "0.1em", fontFamily: "var(--font-display)", wordBreak: "break-all" }}>
                        ◈ {repo.name}
                      </p>
                      {repo.description && <p className="muted" style={{ fontSize: "10px", marginTop: "2px" }}>{repo.description}</p>}
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 6px var(--green)", flexShrink: 0, marginTop: "4px", animation: "pulse 2s infinite" }} />
                  </div>

                  {(repo.url ?? repo.cloneUrl) && (
                    <div style={{ marginBottom: "8px" }}>
                      <span className="input-label">CLONE URL</span>
                      <p style={{ fontSize: "10px", color: "var(--cyan)", wordBreak: "break-all", opacity: 0.7, letterSpacing: "0.02em" }}>{repo.url ?? repo.cloneUrl}</p>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "rgba(0,255,65,0.35)", marginTop: "8px", borderTop: "1px solid rgba(0,255,65,0.06)", paddingTop: "6px" }}>
                    <span>{repo.createdAt ? `created ${timeSince(repo.createdAt)}` : "active"}</span>
                    <span style={{ color: "var(--green)" }}>◈ ONLINE</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}
