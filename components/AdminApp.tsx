"use client";

import { useEffect, useState } from "react";
import { Gift, GiftClaim } from "@/lib/types";

interface AnalyticsData {
  totalGifts: number;
  totalSlots: number;
  claimedSlots: number;
  fullyClaimedGifts: number;
  percentSlotsClaimed: number;
  categoryCounts: { category: string; count: number }[];
  pageviews: {
    totalPageviews: number;
    last7Days: { date: string; count: number }[];
  };
}

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

function parsePositiveInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
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
  const [newMaxClaims, setNewMaxClaims] = useState("1");
  const [newCategory, setNewCategory] = useState("");
  const [newFeatured, setNewFeatured] = useState(false);
  const [newPixKey, setNewPixKey] = useState("");
  const [newQrCodeImage, setNewQrCodeImage] = useState("");
  const [formError, setFormError] = useState("");
  const [adding, setAdding] = useState(false);

  const [releaseTarget, setReleaseTarget] = useState<Gift | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Gift | null>(null);
  const [editTarget, setEditTarget] = useState<Gift | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editLinkInput, setEditLinkInput] = useState("");
  const [editLinks, setEditLinks] = useState<string[]>([]);
  const [editMaxClaims, setEditMaxClaims] = useState("1");
  const [editCategory, setEditCategory] = useState("");
  const [editFeatured, setEditFeatured] = useState(false);
  const [editPixKey, setEditPixKey] = useState("");
  const [editQrCodeImage, setEditQrCodeImage] = useState("");
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null);
  const [releaseClaimTarget, setReleaseClaimTarget] = useState<{ gift: Gift; claim: GiftClaim } | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [reorderingCategory, setReorderingCategory] = useState(false);

  async function checkSession() {
    setCheckingSession(true);
    try {
      const res = await fetch("/api/admin/session", { cache: "no-store" });
      const data = await res.json();
      setIsAdmin(!!data.isAdmin);
      if (data.isAdmin) {
        await loadGifts();
        await loadCategories();
        await loadAnalytics();
      }
    } finally {
      setCheckingSession(false);
    }
  }

  async function loadGifts() {
    setLoadingGifts(true);
    try {
      const res = await fetch("/api/gifts?view=admin", { cache: "no-store" });
      const data = await res.json();
      setGifts(data.gifts || []);
    } finally {
      setLoadingGifts(false);
    }
  }

  async function loadCategories() {
    try {
      const res = await fetch("/api/categories", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setCategoryOrder(data.categories || []);
      }
    } catch (e) {
      console.error("Erro ao carregar categorias:", e);
    }
  }

  async function loadAnalytics() {
    setLoadingAnalytics(true);
    try {
      const res = await fetch("/api/analytics", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } finally {
      setLoadingAnalytics(false);
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
        const data = await res.json().catch(() => null);
        setLoginError(data?.error || "Senha incorreta. Tente novamente.");
        return;
      }
      setIsAdmin(true);
      await loadGifts();
      await loadCategories();
      await loadAnalytics();
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
    const maxClaims = parsePositiveInteger(newMaxClaims);
    setFormError("");
    setAdding(true);
    try {
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          description: newDesc,
          links: newLinks,
          maxClaims,
          category: newCategory,
          featured: newFeatured,
          pixKey: newPixKey,
          qrCodeImage: newQrCodeImage
        })
      });
      if (res.ok) {
        setNewName("");
        setNewLinkInput("");
        setNewLinks([]);
        setNewDesc("");
        setNewMaxClaims("1");
        setNewCategory("");
        setNewFeatured(false);
        setNewPixKey("");
        setNewQrCodeImage("");
        await loadGifts();
        await loadCategories();
        await loadAnalytics();
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
    await loadAnalytics();
  }

  async function confirmReleaseClaim() {
    if (!releaseClaimTarget) return;
    await fetch(`/api/gifts/${releaseClaimTarget.gift.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseClaim: true, guestWhatsapp: releaseClaimTarget.claim.guestWhatsapp })
    });
    setReleaseClaimTarget(null);
    await loadGifts();
    await loadAnalytics();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/gifts/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    await loadGifts();
    await loadAnalytics();
  }

  async function moveGift(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= gifts.length) return;

    const reordered = [...gifts];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    // Optimistic update so the drag/tap feels instant for the noiva.
    setGifts(reordered);
    setReorderingId(moved.id);
    try {
      const res = await fetch("/api/gifts/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((g) => g.id) })
      });
      if (!res.ok) {
        // Roll back to the server's source of truth on failure.
        await loadGifts();
      }
    } catch {
      await loadGifts();
    } finally {
      setReorderingId(null);
    }
  }

  async function moveCategory(index: number, direction: -1 | 1, currentOrder: string[]) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentOrder.length) return;

    const reordered = [...currentOrder];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    // Optimistic update so the tap feels instant.
    setCategoryOrder(reordered);
    setReorderingCategory(true);
    try {
      const res = await fetch("/api/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedCategories: reordered })
      });
      if (!res.ok) {
        await loadCategories();
      }
    } catch {
      await loadCategories();
    } finally {
      setReorderingCategory(false);
    }
  }

  function openEditModal(gift: Gift) {
    setEditTarget(gift);
    setEditName(gift.name);
    setEditDesc(gift.description);
    setEditLinkInput("");
    setEditLinks([...(gift.links || [])]);
    setEditMaxClaims(String(gift.maxClaims || 1));
    setEditCategory(gift.category || "");
    setEditFeatured(!!gift.featured);
    setEditPixKey(gift.pixKey || "");
    setEditQrCodeImage(gift.qrCodeImage || "");
    setEditError("");
  }

  async function saveEdit() {
    if (!editTarget) return;
    if (!editName.trim()) {
      setEditError("Dê um nome ao presente antes de salvar.");
      return;
    }
    const maxClaims = parsePositiveInteger(editMaxClaims);
    setEditError("");
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/gifts/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDesc,
          links: editLinks,
          maxClaims,
          category: editCategory,
          featured: editFeatured,
          pixKey: editPixKey,
          qrCodeImage: editQrCodeImage
        })
      });

      if (res.ok) {
        setEditTarget(null);
        setEditName("");
        setEditDesc("");
        setEditLinkInput("");
        setEditLinks([]);
        setEditMaxClaims("1");
        setEditCategory("");
        setEditFeatured(false);
        setEditPixKey("");
        setEditQrCodeImage("");
        setEditError("");
        await loadGifts();
        await loadCategories();
        await loadAnalytics();
      }
    } finally {
      setSavingEdit(false);
    }
  }

  // Merges the admin-configured category order with whatever categories
  // currently exist on gifts, so newly created categories still show up
  // (appended at the end) even before they've been explicitly reordered.
  const distinctGiftCategories = Array.from(new Set(gifts.map((g) => g.category).filter(Boolean)));
  const positionedCategories = categoryOrder.filter((c) => distinctGiftCategories.includes(c));
  const remainingCategories = distinctGiftCategories.filter((c) => !positionedCategories.includes(c));
  const displayCategoryOrder = [...positionedCategories, ...remainingCategories];

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
          <a className="btn btn-ghost" href="/" style={{ display: "block", marginTop: 10, textAlign: "center", textDecoration: "none" }}>
            Voltar para a tela inicial
          </a>
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
        <datalist id="gift-categories">
          {Array.from(new Set(gifts.map((g) => g.category).filter(Boolean))).map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <div className="section-head" style={{ marginTop: 30 }}>
          <div className="section-title">Visão geral</div>
          <div className="section-note">{loadingAnalytics ? "atualizando…" : ""}</div>
        </div>

        {analytics && (
          <div className="analytics-panel">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{analytics.totalGifts}</div>
                <div className="stat-label">Presentes cadastrados</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{analytics.fullyClaimedGifts}</div>
                <div className="stat-label">Totalmente escolhidos</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{analytics.percentSlotsClaimed}%</div>
                <div className="stat-label">
                  Vagas preenchidas ({analytics.claimedSlots}/{analytics.totalSlots})
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{analytics.pageviews.totalPageviews}</div>
                <div className="stat-label">Visualizações da lista</div>
              </div>
            </div>

            {analytics.categoryCounts.length > 0 && (
              <div className="analytics-subsection">
                <div className="analytics-subhead">Presentes por categoria</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {analytics.categoryCounts.map((c) => (
                    <span key={c.category} className="category-chip category-chip-lg">
                      {c.category} · {c.count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="analytics-subsection">
              <div className="analytics-subhead">Visualizações nos últimos 7 dias</div>
              <div className="pageview-bars">
                {(() => {
                  const maxCount = Math.max(1, ...analytics.pageviews.last7Days.map((d) => d.count));
                  return analytics.pageviews.last7Days.map((d) => {
                    const [, month, day] = d.date.split("-");
                    return (
                      <div key={d.date} className="pageview-bar-col" title={`${d.date}: ${d.count} visualização(ões)`}>
                        <div className="pageview-bar-track">
                          <div className="pageview-bar" style={{ height: `${Math.max(4, (d.count / maxCount) * 100)}%` }} />
                        </div>
                        <div className="pageview-bar-label">
                          {day}/{month}
                        </div>
                        <div className="pageview-bar-count">{d.count}</div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}

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
            <label>Categoria (opcional)</label>
            <input
              type="text"
              list="gift-categories"
              placeholder="Ex: Cozinha, Casa, Lua de mel"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
          </div>
          <div className="field">
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={newFeatured} onChange={(e) => setNewFeatured(e.target.checked)} style={{ width: "auto" }} />
              Destacar este presente (aparece em posição de destaque, com visual diferenciado)
            </label>
          </div>
          <div className="field">
            <label>Chave Pix (opcional)</label>
            <input
              type="text"
              placeholder="Ex: email@exemplo.com, CPF ou chave aleatória"
              value={newPixKey}
              onChange={(e) => setNewPixKey(e.target.value)}
            />
          </div>
          <div className="field">
            <label>URL da imagem do QR Code Pix (opcional)</label>
            <input
              type="text"
              placeholder="Ex: /pix-lua-de-mel.png"
              value={newQrCodeImage}
              onChange={(e) => setNewQrCodeImage(e.target.value)}
            />
            {newQrCodeImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={newQrCodeImage}
                alt="Pré-visualização do QR Code"
                style={{ marginTop: 10, width: 120, height: 120, objectFit: "contain", border: "1px solid var(--line)", borderRadius: 4 }}
              />
            )}
          </div>
          <div className="field">
            <label>Quantidade de pessoas que podem escolher</label>
            <input
              type="number"
              min={1}
              step={1}
              placeholder="1"
              value={newMaxClaims}
              onChange={(e) => setNewMaxClaims(e.target.value)}
            />
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

        {displayCategoryOrder.length > 1 && (
          <>
            <div className="section-head" style={{ marginTop: 30 }}>
              <div className="section-title">Ordem das categorias</div>
              <div className="section-note">{reorderingCategory ? "atualizando…" : ""}</div>
            </div>
            <p className="hint" style={{ margin: "-6px 0 14px", fontSize: 12.5, color: "var(--ink-soft)" }}>
              Use as setas para definir a ordem em que as categorias aparecem para os convidados.
            </p>
            <div className="admin-list">
              {displayCategoryOrder.map((cat, index) => (
                <div className="admin-item" key={cat}>
                  <div className="admin-item-reorder">
                    <button
                      type="button"
                      className="reorder-btn"
                      onClick={() => moveCategory(index, -1, displayCategoryOrder)}
                      disabled={index === 0 || reorderingCategory}
                      aria-label={`Mover categoria "${cat}" para cima`}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="reorder-btn"
                      onClick={() => moveCategory(index, 1, displayCategoryOrder)}
                      disabled={index === displayCategoryOrder.length - 1 || reorderingCategory}
                      aria-label={`Mover categoria "${cat}" para baixo`}
                    >
                      ▼
                    </button>
                  </div>
                  <div className="admin-item-main">
                    <div className="name">{cat}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="section-head">
          <div className="section-title">Todos os presentes</div>
          <div className="section-note">{loadingGifts ? "atualizando…" : `${gifts.length} presente(s) cadastrado(s)`}</div>
        </div>

        {gifts.length > 0 && (
          <p className="hint" style={{ margin: "-6px 0 14px", fontSize: 12.5, color: "var(--ink-soft)" }}>
            Use as setas para definir a ordem em que os convidados verão os presentes.
          </p>
        )}

        {gifts.length === 0 ? (
          <div className="empty">Nenhum presente cadastrado ainda. Adicione o primeiro acima.</div>
        ) : (
          <div className="admin-list">
            {gifts.map((g, index) => (
              <div className="admin-item" key={g.id}>
                <div className="admin-item-reorder">
                  <button
                    type="button"
                    className="reorder-btn"
                    onClick={() => moveGift(index, -1)}
                    disabled={index === 0 || reorderingId !== null}
                    aria-label={`Mover "${g.name}" para cima`}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="reorder-btn"
                    onClick={() => moveGift(index, 1)}
                    disabled={index === gifts.length - 1 || reorderingId !== null}
                    aria-label={`Mover "${g.name}" para baixo`}
                  >
                    ▼
                  </button>
                </div>
                <div className="admin-item-main">
                  <div className="name">
                    {g.name}
                    {g.category && <span className="category-chip">{g.category}</span>}
                    {g.featured && <span className="category-chip category-chip-featured">★ Destaque</span>}
                  </div>
                  {g.claims.length > 0 ? (
                    <div className="guest-tag">
                      {g.claims.length === 1 ? (
                        <>
                          Escolhido por <strong>{g.claims[0].guestName}</strong> ·{" "}
                          <a href={`https://wa.me/${onlyDigitsWithCountryCode(g.claims[0].guestWhatsapp)}`} target="_blank" rel="noopener noreferrer">
                            {g.claims[0].guestWhatsapp}
                          </a>
                        </>
                      ) : (
                        <>
                          {g.claims.length} pessoas já escolheram · {Math.max(g.maxClaims - g.claims.length, 0)} vaga(s) restante(s)
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="available-tag">{g.maxClaims === 1 ? "Disponível" : `Disponível para ${g.maxClaims} pessoas`}</div>
                  )}
                  {g.claims.length > 1 && (
                    <div className="desc" style={{ marginTop: 6, display: "grid", gap: 4 }}>
                      {g.claims.map((claim, index) => (
                        <div key={`${claim.guestWhatsapp}-${index}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <div>
                            {index + 1}. <strong>{claim.guestName}</strong> ·{" "}
                            <a href={`https://wa.me/${onlyDigitsWithCountryCode(claim.guestWhatsapp)}`} target="_blank" rel="noopener noreferrer">
                              {claim.guestWhatsapp}
                            </a>
                          </div>
                          <button className="btn btn-ghost" onClick={() => setReleaseClaimTarget({ gift: g, claim })}>
                            Liberar pessoa
                          </button>
                        </div>
                      ))}
                    </div>
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
                  {g.claims.length > 0 && (
                    <button className="btn btn-ghost" onClick={() => setReleaseTarget(g)}>
                      Liberar todos
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
              Isso vai apagar o nome e WhatsApp de todas as pessoas que escolheram &ldquo;{releaseTarget.name}&rdquo; e deixar o
              presente disponível novamente. Use apenas em caso de engano.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setReleaseTarget(null)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={confirmRelease}>
                Liberar todos
              </button>
            </div>
          </div>
        </div>
      )}

      {releaseClaimTarget && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setReleaseClaimTarget(null)}>
          <div className="modal">
            <button className="close-x" onClick={() => setReleaseClaimTarget(null)}>
              &times;
            </button>
            <h3>Liberar esta pessoa?</h3>
            <p className="hint">
              Isso vai remover <strong>{releaseClaimTarget.claim.guestName}</strong> do presente &ldquo;{releaseClaimTarget.gift.name}&rdquo;.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setReleaseClaimTarget(null)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={confirmReleaseClaim}>
                Liberar pessoa
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
                setEditMaxClaims("1");
                setEditCategory("");
                setEditFeatured(false);
                setEditPixKey("");
                setEditQrCodeImage("");
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
              <label>Categoria (opcional)</label>
              <input
                type="text"
                list="gift-categories"
                placeholder="Ex: Cozinha, Casa, Lua de mel"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
              />
            </div>
            <div className="field">
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={editFeatured} onChange={(e) => setEditFeatured(e.target.checked)} style={{ width: "auto" }} />
                Destacar este presente (aparece em posição de destaque, com visual diferenciado)
              </label>
            </div>
            <div className="field">
              <label>Chave Pix (opcional)</label>
              <input
                type="text"
                placeholder="Ex: email@exemplo.com, CPF ou chave aleatória"
                value={editPixKey}
                onChange={(e) => setEditPixKey(e.target.value)}
              />
            </div>
            <div className="field">
              <label>URL da imagem do QR Code Pix (opcional)</label>
              <input
                type="text"
                placeholder="Ex: /pix-lua-de-mel.png"
                value={editQrCodeImage}
                onChange={(e) => setEditQrCodeImage(e.target.value)}
              />
              {editQrCodeImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={editQrCodeImage}
                  alt="Pré-visualização do QR Code"
                  style={{ marginTop: 10, width: 120, height: 120, objectFit: "contain", border: "1px solid var(--line)", borderRadius: 4 }}
                />
              )}
            </div>
            <div className="field">
              <label>Quantidade de pessoas que podem escolher</label>
              <input
                type="number"
                min={1}
                step={1}
                placeholder="1"
                value={editMaxClaims}
                onChange={(e) => setEditMaxClaims(e.target.value)}
              />
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
                  setEditMaxClaims("1");
                  setEditCategory("");
                  setEditFeatured(false);
                  setEditPixKey("");
                  setEditQrCodeImage("");
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
