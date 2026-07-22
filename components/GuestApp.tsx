"use client";

import { useEffect, useRef, useState } from "react";
import { PublicGift } from "@/lib/types";

// Fixed site-wide Pix details for the general "help with money" floating
// button (independent of any specific gift's own Pix info). Showing the
// receiver's full name alongside the key/QR helps guests confirm the
// payment is going to the right person before confirming.
const SITE_PIX_KEY = "marciaematheuscasamento@gmail.com";
const SITE_PIX_QR_IMAGE = "/pix-lua-de-mel.png";
const SITE_PIX_RECEIVER_NAME = "Marcia Laryssa Alves da Silva";

function displayLinkBase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed;
  }
}

export default function GuestApp() {
  const [gifts, setGifts] = useState<PublicGift[] | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<PublicGift | null>(null);
  const [claimTarget, setClaimTarget] = useState<PublicGift | null>(null);
  const [thankYouTarget, setThankYouTarget] = useState<{ giftName: string; guestName: string } | null>(null);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [copiedPixKey, setCopiedPixKey] = useState<string | null>(null);
  const [showPixWidget, setShowPixWidget] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function copyPixKey(key: string) {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      setCopiedPixKey(key);
      setTimeout(() => {
        setCopiedPixKey((current) => (current === key ? null : current));
      }, 2000);
    } catch {
      // Clipboard API may be unavailable (e.g. insecure context); fail silently.
    }
  }

  async function loadGifts() {
    try {
      const [giftsRes, categoriesRes] = await Promise.all([
        fetch("/api/gifts", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" })
      ]);
      const data = await giftsRes.json();
      setGifts(data.gifts || []);
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategoryOrder(categoriesData.categories || []);
      }
      setLastUpdatedAt(Date.now());
    } catch (e) {
      console.error("Erro ao carregar presentes:", e);
    }
  }

  useEffect(() => {
    loadGifts();
    pollRef.current = setInterval(loadGifts, 6000);
    // Fire-and-forget: counts a real page load, not the polling refreshes.
    fetch("/api/analytics/pageview", { method: "POST" }).catch(() => {});
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function openClaim(g: PublicGift) {
    setClaimTarget(g);
    setName("");
    setWhatsapp("");
    setError("");
  }

  function openDetails(g: PublicGift) {
    setDetailsTarget(g);
  }

  function getGiftLinks(gift: PublicGift): string[] {
    return gift.links?.length ? gift.links : gift.link ? [gift.link] : [];
  }

  function openClaimFromDetails() {
    if (!detailsTarget || detailsTarget.taken) return;
    const current = detailsTarget;
    setDetailsTarget(null);
    openClaim(current);
  }

  function formatLastUpdated(timestamp: number | null): string {
    if (!timestamp) return "";
    const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
    if (seconds < 10) return "agora";
    if (seconds < 60) return `há ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `há ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    return `há ${hours}h`;
  }

  async function confirmClaim() {
    if (!claimTarget) return;
    const digits = whatsapp.replace(/\D/g, "");
    if (!name.trim() || !whatsapp.trim() || digits.length < 10) {
      setError(!name.trim() || !whatsapp.trim() ? "Preencha nome e WhatsApp para confirmar." : "Digite um número de WhatsApp válido, com DDD.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/gifts/${claimTarget.id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, whatsapp })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          alert("Ops! Esse presente acabou de ser escolhido por outra pessoa. Escolha outro item da lista.");
        } else {
          alert(data.error || "Não foi possível confirmar agora. Tente novamente.");
        }
        setClaimTarget(null);
        await loadGifts();
        return;
      }
      setClaimTarget(null);
      setThankYouTarget({ giftName: claimTarget.name, guestName: name.trim() });
      await loadGifts();
    } catch (e) {
      console.error(e);
      alert("Não foi possível confirmar agora. Tente novamente em instantes.");
    } finally {
      setSubmitting(false);
    }
  }

  function giftCategoryLabel(g: PublicGift): string {
    return g.category?.trim() || "Outros presentes";
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filteredGifts = gifts
    ? gifts.filter((g) => {
        if (selectedCategory && giftCategoryLabel(g) !== selectedCategory) return false;
        if (!normalizedSearch) return true;
        const haystack = `${g.name} ${g.description} ${g.category} ${(g.links || []).join(" ")} ${g.link}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      })
    : gifts;
  const filteredAvailable = filteredGifts ? filteredGifts.filter((g) => !g.taken).length : 0;
  const updatedLabel = lastUpdatedAt ? `atualizado ${formatLastUpdated(lastUpdatedAt)}` : "carregando…";

  // All categories currently in use (regardless of the active filter), used
  // to power the filter pills and to order the grouped sections below,
  // following the admin-configured category order.
  const allCategories = gifts ? Array.from(new Set(gifts.map(giftCategoryLabel))) : [];
  const orderedCategories = (() => {
    const positioned = categoryOrder.filter((c) => allCategories.includes(c));
    const remaining = allCategories.filter((c) => !positioned.includes(c));
    return [...positioned, ...remaining];
  })();

  // Groups the (already filtered) gifts by category, following the
  // admin-configured category display order. Featured gifts are pulled out
  // into their own highlighted section instead, so they aren't duplicated.
  const featuredGifts = filteredGifts ? filteredGifts.filter((g) => g.featured) : [];
  const groupedGifts: { category: string; items: PublicGift[] }[] = filteredGifts
    ? orderedCategories
        .map((category) => ({
          category,
          items: filteredGifts.filter((g) => !g.featured && giftCategoryLabel(g) === category)
        }))
        .filter((group) => group.items.length > 0)
    : [];
  const hasMultipleCategories = allCategories.length > 1;

  return (
    <>
      <div className="wrap" id="guestView">
        <div className="section-head">
          <div className="section-title">Presentes</div>
          <div className="section-note">
            {gifts ? `${filteredAvailable} de ${filteredGifts ? filteredGifts.length : 0} disponíveis · ${updatedLabel}` : "carregando…"}
          </div>
        </div>

        <div className="field" style={{ marginBottom: 18 }}>
          <label>Buscar presente</label>
          <input
            type="text"
            placeholder="Digite parte do nome, descrição ou link"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {hasMultipleCategories && (
          <div className="field" style={{ marginBottom: 18 }}>
            <label>Filtrar por categoria</label>
            <div className="category-filter-list">
              <button
                type="button"
                className={`category-filter-chip ${selectedCategory === "" ? "is-active" : ""}`}
                onClick={() => setSelectedCategory("")}
              >
                Todas
              </button>
              {orderedCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`category-filter-chip ${selectedCategory === cat ? "is-active" : ""}`}
                  onClick={() => setSelectedCategory((current) => (current === cat ? "" : cat))}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {gifts === null && <div className="loading">Carregando a lista de presentes…</div>}
        {gifts !== null && gifts.length === 0 && <div className="empty">Ainda não há presentes cadastrados nesta lista.</div>}

        {gifts !== null && gifts.length > 0 && filteredGifts && filteredGifts.length === 0 && (
          <div className="empty">Nenhum presente encontrado com esse filtro.</div>
        )}

        {gifts !== null && filteredGifts && filteredGifts.length > 0 && (
          <>
            {featuredGifts.length > 0 && (
              <div className="featured-section">
                {featuredGifts.map((g) => (
                  <div className="featured-card" key={g.id}>
                    <div className="featured-badge">Presente em destaque</div>
                    <div className="featured-body">
                      <div className="featured-main">
                        <div className="featured-name">{g.name}</div>
                        {g.description && <div className="featured-desc">{g.description}</div>}
                        {g.taken ? (
                          <div className="status-taken">Vagas esgotadas para este presente 💌</div>
                        ) : (
                          <>
                            {g.maxClaims > 1 && (
                              <div className="available-tag" style={{ marginBottom: 8 }}>
                                {`${g.claimedCount} de ${g.maxClaims} ajudaram`}
                              </div>
                            )}
                            <button className="btn btn-primary" onClick={() => openDetails(g)}>
                              Ver mais informações
                            </button>
                          </>
                        )}
                      </div>
                      {(g.pixKey || g.qrCodeImage) && (
                        <div className="featured-pix">
                          <div className="featured-pix-label">Contribuir via Pix</div>
                          {g.qrCodeImage && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={g.qrCodeImage} alt={`QR Code Pix de ${g.name}`} className="featured-qr" />
                          )}
                          {g.pixKey && (
                            <button type="button" className="pix-key-box" onClick={() => copyPixKey(g.pixKey)}>
                              <span className="pix-key-value">{g.pixKey}</span>
                              <span className="pix-key-copy">{copiedPixKey === g.pixKey ? "Copiado!" : "Copiar chave"}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {groupedGifts.map((group) => (
              <div key={group.category} className="category-section">
                {hasMultipleCategories && <div className="category-heading">{group.category}</div>}
                <div className="grid">
                  {group.items.map((g) => (
                    <div
                      className={`card ${g.taken ? "taken" : ""}`}
                      key={g.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Ver detalhes de ${g.name}`}
                      onClick={() => openDetails(g)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openDetails(g);
                        }
                      }}
                    >
                      {g.taken && (
                        <div className="seal">
                          <span>
                            Já
                            <br />
                            escolhido
                          </span>
                        </div>
                      )}
                      <div className="card-name">{g.name}</div>
                      <div className="card-desc">{g.description}</div>
                      {getGiftLinks(g).length > 0 && (
                        <div className="card-link">
                          {getGiftLinks(g).length === 1 ? "1 referência sugerida" : `${getGiftLinks(g).length} referências sugeridas`}
                        </div>
                      )}
                      <div className="card-footer">
                        {g.taken ? (
                          <div className="status-taken">Vagas esgotadas para este presente 💌</div>
                        ) : (
                          <>
                            {g.maxClaims > 1 && (
                              <div className="available-tag" style={{ marginBottom: 8 }}>
                                {`${g.claimedCount} de ${g.maxClaims} ajudaram`}
                              </div>
                            )}
                            <button className="btn btn-primary" onClick={() => openDetails(g)}>
                              Ver mais informações
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {detailsTarget && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setDetailsTarget(null)}>
          <div className="modal">
            <button className="close-x" onClick={() => setDetailsTarget(null)}>
              &times;
            </button>
            <h3>{detailsTarget.name}</h3>
            <p className="hint">Veja os detalhes antes de escolher este presente.</p>
            <div className="detail-stack">
              <div className="detail-card">
                <div className="detail-label">Descrição</div>
                <div className="detail-value">{detailsTarget.description || "Sem descrição informada."}</div>
              </div>
              <div className="detail-card">
                <div className="detail-label">Status</div>
                <div className={`detail-value detail-status ${detailsTarget.taken ? "is-taken" : "is-available"}`}>
                  {detailsTarget.taken ? "Vagas esgotadas" : "Disponível"}
                </div>
              </div>
              <div className="detail-card">
                <div className="detail-label">Capacidade</div>
                <div className={`detail-value detail-status ${detailsTarget.taken ? "is-taken" : "is-available"}`}>
                  {detailsTarget.maxClaims === 1
                    ? detailsTarget.claimedCount > 0
                      ? "1 pessoa já escolheu"
                      : "1 pessoa pode escolher"
                    : detailsTarget.taken
                      ? `${detailsTarget.claimedCount} de ${detailsTarget.maxClaims} ajudaram`
                      : `${detailsTarget.claimedCount} de ${detailsTarget.maxClaims} ajudaram`}
                </div>
              </div>
            </div>
            {(detailsTarget.pixKey || detailsTarget.qrCodeImage) && (
              <div className="detail-card detail-link-card">
                <div className="detail-label">Contribuir via Pix</div>
                {detailsTarget.qrCodeImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={detailsTarget.qrCodeImage}
                    alt={`QR Code Pix de ${detailsTarget.name}`}
                    style={{ width: 170, height: 170, objectFit: "contain", margin: "6px auto 10px", display: "block" }}
                  />
                )}
                {detailsTarget.pixKey && (
                  <button
                    type="button"
                    className="pix-key-box"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyPixKey(detailsTarget.pixKey);
                    }}
                  >
                    <span className="pix-key-value">{detailsTarget.pixKey}</span>
                    <span className="pix-key-copy">{copiedPixKey === detailsTarget.pixKey ? "Copiado!" : "Copiar chave"}</span>
                  </button>
                )}
              </div>
            )}
            {getGiftLinks(detailsTarget).length > 0 && (
              <div className="detail-card detail-link-card">
                <div className="detail-label">Sugestões de referência</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {getGiftLinks(detailsTarget).map((link, index) => (
                    <a key={`${link}-${index}`} className="detail-link" href={link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                      Opção {index + 1}: {displayLinkBase(link)}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setDetailsTarget(null)}>
                Voltar
              </button>
              {!detailsTarget.taken && (
                <button className="btn btn-primary" onClick={openClaimFromDetails}>
                  {detailsTarget.maxClaims === 1 ? "Escolher este presente" : "Quero ajudar com este presente"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {claimTarget && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setClaimTarget(null)}>
          <div className="modal">
            <button className="close-x" onClick={() => setClaimTarget(null)}>
              &times;
            </button>
            <h3>Escolher este presente</h3>
            <p className="hint">{claimTarget.name}</p>
            <div className="field">
              <label>Seu nome *</label>
              <input type="text" placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label>Seu WhatsApp *</label>
              <input type="text" placeholder="(11) 91234-5678" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setClaimTarget(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={confirmClaim} disabled={submitting}>
                {submitting ? "Confirmando…" : "Confirmar presente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {thankYouTarget && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setThankYouTarget(null)}>
          <div className="modal">
            <button className="close-x" onClick={() => setThankYouTarget(null)}>
              &times;
            </button>
            <h3>Obrigado por ajudar!</h3>
            <p className="hint">
              {thankYouTarget.guestName}, sua escolha de &ldquo;{thankYouTarget.giftName}&rdquo; foi registrada com carinho.
            </p>
            <div className="detail-card">
              <div className="detail-label">Data do casamento</div>
              <div className="detail-value">19.09.2026</div>
            </div>
            <p className="hint" style={{ marginTop: 14 }}>
              Obrigado por fazer parte desse momento com a gente.
            </p>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setThankYouTarget(null)}>
                Voltar para a lista
              </button>
            </div>
          </div>
        </div>
      )}

      <button type="button" className="pix-float-btn" onClick={() => setShowPixWidget(true)} aria-label="Ajudar com Pix">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
          <rect x="14" y="14" width="3" height="3" rx="1" fill="currentColor" />
          <rect x="18" y="18" width="3" height="3" rx="1" fill="currentColor" />
          <rect x="14" y="18" width="3" height="3" rx="1" fill="currentColor" />
          <rect x="18" y="14" width="3" height="3" rx="1" fill="currentColor" />
        </svg>
        <span>Ajudar com Pix</span>
      </button>

      {showPixWidget && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setShowPixWidget(false)}>
          <div className="modal">
            <button className="close-x" onClick={() => setShowPixWidget(false)}>
              &times;
            </button>
            <h3>Ajudar com Pix</h3>
            <p className="hint">Se preferir, você pode ajudar os noivos diretamente com uma contribuição livre via Pix.</p>
            <div className="detail-stack">
              <div className="detail-card">
                <div className="detail-label">Recebedor</div>
                <div className="detail-value">{SITE_PIX_RECEIVER_NAME}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={SITE_PIX_QR_IMAGE}
                alt={`QR Code Pix de ${SITE_PIX_RECEIVER_NAME}`}
                style={{ width: 190, height: 190, objectFit: "contain", border: "1px solid var(--line)", borderRadius: 4, background: "#fff", padding: 6 }}
              />
              <button type="button" className="pix-key-box" onClick={() => copyPixKey(SITE_PIX_KEY)}>
                <span className="pix-key-value">{SITE_PIX_KEY}</span>
                <span className="pix-key-copy">{copiedPixKey === SITE_PIX_KEY ? "Copiado!" : "Copiar chave"}</span>
              </button>
            </div>
            <p className="hint" style={{ marginTop: 14 }}>
              Antes de confirmar o pagamento, confira se o nome do recebedor exibido no seu app é <strong>{SITE_PIX_RECEIVER_NAME}</strong>.
            </p>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setShowPixWidget(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
