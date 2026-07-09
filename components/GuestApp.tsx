"use client";

import { useEffect, useRef, useState } from "react";
import { PublicGift } from "@/lib/types";

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
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadGifts() {
    try {
      const res = await fetch("/api/gifts", { cache: "no-store" });
      const data = await res.json();
      setGifts(data.gifts || []);
      setLastUpdatedAt(Date.now());
    } catch (e) {
      console.error("Erro ao carregar presentes:", e);
    }
  }

  useEffect(() => {
    loadGifts();
    pollRef.current = setInterval(loadGifts, 6000);
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
      await loadGifts();
    } catch (e) {
      console.error(e);
      alert("Não foi possível confirmar agora. Tente novamente em instantes.");
    } finally {
      setSubmitting(false);
    }
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filteredGifts =
    gifts && normalizedSearch
      ? gifts.filter((g) => {
          const haystack = `${g.name} ${g.description} ${(g.links || []).join(" ")} ${g.link}`.toLowerCase();
          return haystack.includes(normalizedSearch);
        })
      : gifts;
  const filteredAvailable = filteredGifts ? filteredGifts.filter((g) => !g.taken).length : 0;
  const updatedLabel = lastUpdatedAt ? `atualizado ${formatLastUpdated(lastUpdatedAt)}` : "carregando…";

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

        {gifts === null && <div className="loading">Carregando a lista de presentes…</div>}
        {gifts !== null && gifts.length === 0 && <div className="empty">Ainda não há presentes cadastrados nesta lista.</div>}

        {gifts !== null && gifts.length > 0 && filteredGifts && filteredGifts.length === 0 && (
          <div className="empty">Nenhum presente encontrado com esse filtro.</div>
        )}

        {gifts !== null && filteredGifts && filteredGifts.length > 0 && (
          <div className="grid">
            {filteredGifts.map((g) => (
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
                    <div className="status-taken">Alguém já vai dar este presente 💌</div>
                  ) : (
                    <button className="btn btn-primary" onClick={() => openDetails(g)}>
                      Ver mais informações
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
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
                  {detailsTarget.taken ? "Já escolhido" : "Disponível"}
                </div>
              </div>
            </div>
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
                  Escolher este presente
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
    </>
  );
}
