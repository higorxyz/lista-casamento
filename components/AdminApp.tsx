"use client";

import { useEffect, useState } from "react";
import { Gift } from "@/lib/types";

function onlyDigitsWithCountryCode(s: string): string {
  let d = (s || "").replace(/\D/g, "");
  if (d && !d.startsWith("55") && d.length <= 11) d = "55" + d;
  return d;
}

function isValidOptionalUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeLinksList(values: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

function displayLinkBase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed;
  }
}

export default function AdminApp() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loadingGifts, setLoadingGifts] = useState(false);

  const [newName, setNewName] = useState("");
  const [newLinkInput, setNewLinkInput] = useState("");
  const [newLinks, setNewLinks] = useState<string[]>([]);
  const [newDesc, setNewDesc] = useState("");
  const [formError, setFormError] = useState("");
  const [adding, setAdding] = useState(false);

  const [releaseTarget, setReleaseTarget] = useState<Gift | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Gift | null>(null);
  const [editTarget, setEditTarget] = useState<Gift | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editLinkInput, setEditLinkInput] = useState("");
  const [editLinks, setEditLinks] = useState<string[]>([]);
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null);

  async function checkSession() {
    setCheckingSession(true);
    try {
      const res = await fetch("/api/admin/session", { cache: "no-store" });
      const data = await res.json();
      setIsAdmin(!!data.isAdmin);
      if (data.isAdmin) await loadGifts();
    } finally {
      setCheckingSession(false);
    }
  }

  async function loadGifts() {
    setLoadingGifts(true);
    try {
      const res = await fetch("/api/gifts", { cache: "no-store" });
      const data = await res.json();
      setGifts(data.gifts || []);
    } finally {
      setLoadingGifts(false);
    }
  }

  useEffect(() => {
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin() {
    setLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      if (!res.ok) {
        setLoginError("Senha incorreta. Tente novamente.");
        return;
      }
      setIsAdmin(true);
      await loadGifts();
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setIsAdmin(false);
    setPassword("");
  }

  function addNewLink() {
    const value = newLinkInput.trim();
    if (!value) return;
    if (!isValidOptionalUrl(value)) {
      setFormError("Digite um link válido começando com http:// ou https://.");
      return;
    }
    setFormError("");
    setNewLinks((current) => normalizeLinksList([...current, value]));
    setNewLinkInput("");
  }

  function removeNewLink(index: number) {
    setNewLinks((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function addEditLink() {
    const value = editLinkInput.trim();
    if (!value) return;
    if (!isValidOptionalUrl(value)) {
      setEditError("Digite um link válido começando com http:// ou https://.");
      return;
    }
    setEditError("");
    setEditLinks((current) => normalizeLinksList([...current, value]));
    setEditLinkInput("");
  }

  function removeEditLink(index: number) {
    setEditLinks((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleAddGift() {
    if (!newName.trim()) {
      setFormError("Dê um nome ao presente antes de adicionar.");
      return;
    }
    setFormError("");
    setAdding(true);
    try {
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDesc, links: newLinks })
      });
      if (res.ok) {
        setNewName("");
        setNewLinkInput("");
        setNewLinks([]);
        setNewDesc("");
        await loadGifts();
      }
    } finally {
      setAdding(false);
    }
  }

  async function confirmRelease() {
    if (!releaseTarget) return;
    await fetch(`/api/gifts/${releaseTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ release: true })
    });
    setReleaseTarget(null);
    await loadGifts();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/gifts/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    await loadGifts();
  }

  function openEditModal(gift: Gift) {
    setEditTarget(gift);
    setEditName(gift.name);
    setEditDesc(gift.description);
    setEditLinkInput("");
    setEditLinks([...(gift.links || [])]);
    setEditError("");
  }

  async function saveEdit() {
    if (!editTarget) return;
    if (!editName.trim()) {
      setEditError("Dê um nome ao presente antes de salvar.");
      return;
    }
    setEditError("");
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/gifts/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDesc, links: editLinks })
      });

      if (res.ok) {
        setEditTarget(null);
        setEditName("");
        setEditDesc("");
        setEditLinkInput("");
        setEditLinks([]);
        setEditError("");
        await loadGifts();
      }
    } finally {
      setSavingEdit(false);
    }
  }

  if (checkingSession) {
    return <div className="loading">Verificando acesso…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 21, margin: "0 0 6px", color: "var(--wine-deep)" }}>
            Acesso da noiva
          </h3>
          <p className="hint" style={{ color: "var(--ink-soft)", fontSize: 13.5, margin: "0 0 18px", lineHeight: 1.5 }}>
            Digite a senha de administração para gerenciar a lista de presentes.
          </p>
          <div className="field">
            <label>Senha</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
          {loginError && <div className="error-msg">{loginError}</div>}
          <button className="btn btn-primary" onClick={handleLogin} disabled={loggingIn}>
            {loggingIn ? "Entrando…" : "Entrar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="admin-bar">
        <span>Área da noiva — modo administrador</span>
        <button onClick={handleLogout}>Sair do modo admin</button>
      </div>

      <div className="wrap admin-panel">
        <div className="admin-form" style={{ marginTop: 30 }}>
          <h3>Adicionar novo presente</h3>
          <div className="form-row">
            <div className="field">
              <label>Nome do presente *</label>
              <input type="text" placeholder="Ex: Jogo de panelas" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Descrição / modelo desejado (opcional)</label>
            <textarea placeholder="Ex: Preferência pela marca X, cor inox" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          </div>
          <div className="field">
            <label>Links de referência (opcional)</label>
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <input
                type="text"
                placeholder="Cole um link de exemplo"
                value={newLinkInput}
                onChange={(e) => setNewLinkInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addNewLink();
                  }
                }}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={addNewLink}
                style={{
                  width: 44,
                  minWidth: 44,
                  borderRadius: 4,
                  border: "1px solid var(--line)",
                  background: "var(--card)",
                  color: "var(--wine-deep)",
                  fontSize: 20,
                  lineHeight: 1,
                  cursor: "pointer"
                }}
                aria-label="Adicionar link de referência"
              >
                +
              </button>
            </div>
            {newLinks.length > 0 && (
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {newLinks.map((link, index) => (
                  <div key={`${link}-${index}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayLinkBase(link)}</div>
                    <button
                      type="button"
                      onClick={() => removeNewLink(index)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "var(--wine-deep)",
                        cursor: "pointer",
                        padding: 0
                      }}
                    >
                      remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {formError && <div className="error-msg">{formError}</div>}
          <button className="btn btn-primary" style={{ width: "auto", padding: "11px 22px" }} onClick={handleAddGift} disabled={adding}>
            {adding ? "Adicionando…" : "Adicionar presente"}
          </button>
        </div>

        <div className="section-head">
          <div className="section-title">Todos os presentes</div>
          <div className="section-note">{loadingGifts ? "atualizando…" : `${gifts.length} presente(s) cadastrado(s)`}</div>
        </div>

        {gifts.length === 0 ? (
          <div className="empty">Nenhum presente cadastrado ainda. Adicione o primeiro acima.</div>
        ) : (
          <div className="admin-list">
            {gifts.map((g) => (
              <div className="admin-item" key={g.id}>
                <div className="admin-item-main">
                  <div className="name">{g.name}</div>
                  {g.taken ? (
                    <div className="guest-tag">
                      Escolhido por <strong>{g.guestName}</strong> ·{" "}
                      <a href={`https://wa.me/${onlyDigitsWithCountryCode(g.guestWhatsapp)}`} target="_blank" rel="noopener noreferrer">
                        {g.guestWhatsapp}
                      </a>
                    </div>
                  ) : (
                    <div className="available-tag">Disponível</div>
                  )}
                  {g.description && <div className="desc">{g.description}</div>}
                  {(g.links || []).length > 0 && (
                    <div className="desc">
                      {expandedLinkId === g.id ? (
                        <>
                          <div style={{ marginBottom: 4 }}>Referências</div>
                          <div style={{ display: "grid", gap: 6 }}>
                            {g.links.map((link) => (
                              <a key={link} href={link} target="_blank" rel="noopener noreferrer">
                                {displayLinkBase(link)}
                              </a>
                            ))}
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExpandedLinkId((current) => (current === g.id ? null : g.id))}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            color: "var(--sage-deep)",
                            fontFamily: "var(--font-mono)",
                            fontSize: 11.5,
                            textDecoration: "underline",
                            cursor: "pointer"
                          }}
                        >
                          {g.links.length === 1 ? "Ver 1 referência" : `Ver ${g.links.length} referências`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="admin-item-actions">
                  <button className="btn btn-ghost" onClick={() => openEditModal(g)}>
                    Editar
                  </button>
                  {g.taken && (
                    <button className="btn btn-ghost" onClick={() => setReleaseTarget(g)}>
                      Liberar
                    </button>
                  )}
                  <button className="btn btn-danger" onClick={() => setDeleteTarget(g)}>
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {releaseTarget && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setReleaseTarget(null)}>
          <div className="modal">
            <button className="close-x" onClick={() => setReleaseTarget(null)}>
              &times;
            </button>
            <h3>Liberar este presente?</h3>
            <p className="hint">
              Isso vai apagar o nome e WhatsApp do convidado que escolheu &ldquo;{releaseTarget.name}&rdquo; e deixar o presente
              disponível novamente. Use apenas em caso de engano.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setReleaseTarget(null)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={confirmRelease}>
                Liberar presente
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="modal">
            <button className="close-x" onClick={() => setDeleteTarget(null)}>
              &times;
            </button>
            <h3>Excluir presente</h3>
            <p className="hint">&ldquo;{deleteTarget.name}&rdquo; será removido da lista definitivamente.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setEditTarget(null)}>
          <div className="modal">
            <button
              className="close-x"
              onClick={() => {
                setEditTarget(null);
                setEditName("");
                setEditDesc("");
                setEditLinkInput("");
                setEditLinks([]);
                setEditError("");
              }}
            >
              &times;
            </button>
            <h3>Editar presente</h3>
            <div className="field">
              <label>Nome</label>
              <input type="text" placeholder="Ex: Jogo de panelas" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="field">
              <label>Descrição</label>
              <textarea placeholder="Ex: Preferência pela marca X, cor inox" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            <div className="field">
              <label>Links de referência</label>
                <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                  <input
                    type="text"
                    placeholder="Cole um link de exemplo"
                    value={editLinkInput}
                    onChange={(e) => setEditLinkInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addEditLink();
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={addEditLink}
                    style={{
                      width: 44,
                      minWidth: 44,
                      borderRadius: 4,
                      border: "1px solid var(--line)",
                      background: "var(--card)",
                      color: "var(--wine-deep)",
                      fontSize: 20,
                      lineHeight: 1,
                      cursor: "pointer"
                    }}
                    aria-label="Adicionar link de referência"
                  >
                    +
                  </button>
                </div>
                {editLinks.length > 0 && (
                  <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                    {editLinks.map((link, index) => (
                      <div key={`${link}-${index}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayLinkBase(link)}</div>
                        <button
                          type="button"
                          onClick={() => removeEditLink(index)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "var(--wine-deep)",
                            cursor: "pointer",
                            padding: 0
                          }}
                        >
                          remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
            </div>
            {editError && <div className="error-msg">{editError}</div>}
            <div className="modal-actions">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setEditTarget(null);
                  setEditName("");
                  setEditDesc("");
                  setEditLinkInput("");
                  setEditLinks([]);
                  setEditError("");
                }}
              >
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={savingEdit || !editName.trim()}>
                {savingEdit ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
