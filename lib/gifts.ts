import { Redis } from "@upstash/redis";
import { Gift, GiftClaim } from "./types";

const kv = Redis.fromEnv();

// All gifts are stored as a single Redis hash: field = gift id, value = JSON string.
const HASH_KEY = "gifts";
const SEED_FLAG_KEY = "gifts:seeded";
// Admin-configured display order for categories, stored as a JSON array of
// category names (e.g. ["Cozinha", "Casa", "Lua de mel"]).
const CATEGORY_ORDER_KEY = "category_order";

function makeId(): string {
  return "gift_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function normalizeMaxClaims(value: unknown): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
}

function normalizeWhatsappDigits(value: string): string {
  return (value || "").replace(/\D/g, "");
}

function normalizeCategory(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePixKey(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeQrCodeImage(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeFeatured(value: unknown): boolean {
  return value === true || value === "true";
}

function normalizeLinks(input: unknown): string[] {
  const values = Array.isArray(input) ? input : typeof input === "string" ? [input] : [];
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const trimmed = String(value || "").trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

function normalizeClaim(input: unknown): GiftClaim | null {
  if (!input || typeof input !== "object") return null;
  const claim = input as Partial<GiftClaim>;
  const guestName = String(claim.guestName || "").trim();
  const guestWhatsapp = String(claim.guestWhatsapp || "").trim();
  const claimedAt = typeof claim.claimedAt === "number" ? claim.claimedAt : Date.now();
  if (!guestName || !guestWhatsapp) return null;
  return { guestName, guestWhatsapp, claimedAt };
}

function normalizeClaims(raw: Partial<Gift> & { claims?: unknown }): GiftClaim[] {
  if (Array.isArray(raw.claims)) {
    const seen = new Set<string>();
    const normalized: GiftClaim[] = [];
    for (const item of raw.claims) {
      const claim = normalizeClaim(item);
      if (!claim) continue;
      const key = normalizeWhatsappDigits(claim.guestWhatsapp) || `${claim.guestName}|${claim.claimedAt}`;
      if (seen.has(key)) continue;
      seen.add(key);
      normalized.push(claim);
    }
    return normalized;
  }

  const legacyGuestName = String(raw.guestName || "").trim();
  const legacyGuestWhatsapp = String(raw.guestWhatsapp || "").trim();
  if (raw.taken && legacyGuestName && legacyGuestWhatsapp) {
    return [
      {
        guestName: legacyGuestName,
        guestWhatsapp: legacyGuestWhatsapp,
        claimedAt: typeof raw.claimedAt === "number" ? raw.claimedAt : Date.now()
      }
    ];
  }

  return [];
}

function normalizeGift(raw: Partial<Gift> & { links?: unknown; link?: unknown; claims?: unknown; maxClaims?: unknown }): Gift {
  const links = normalizeLinks(raw.links ?? raw.link);
  const primaryLink = links[0] || (typeof raw.link === "string" ? raw.link.trim() : "");
  const claims = normalizeClaims(raw);
  const maxClaims = normalizeMaxClaims(raw.maxClaims);
  const taken = claims.length >= maxClaims;
  const latestClaim = claims[claims.length - 1];
  const addedAt = typeof raw.addedAt === "number" ? raw.addedAt : Date.now();

  return {
    id: String(raw.id || makeId()),
    name: String(raw.name || "").trim(),
    description: String(raw.description || "").trim(),
    link: primaryLink,
    links,
    maxClaims,
    claims,
    taken,
    guestName: latestClaim ? latestClaim.guestName : String(raw.guestName || "").trim(),
    guestWhatsapp: latestClaim ? latestClaim.guestWhatsapp : String(raw.guestWhatsapp || "").trim(),
    addedAt,
    claimedAt: latestClaim ? latestClaim.claimedAt : typeof raw.claimedAt === "number" ? raw.claimedAt : undefined,
    // Existing gifts (created before manual ordering existed) fall back to their
    // addedAt timestamp, preserving today's chronological order until the admin
    // explicitly reorders them via reorderGifts().
    order: typeof raw.order === "number" ? raw.order : addedAt,
    category: normalizeCategory((raw as Partial<Gift>).category),
    featured: normalizeFeatured((raw as Partial<Gift>).featured),
    pixKey: normalizePixKey((raw as Partial<Gift>).pixKey),
    qrCodeImage: normalizeQrCodeImage((raw as Partial<Gift>).qrCodeImage)
  };
}

function seedGifts(): Gift[] {
  const now = Date.now();
  return [
    {
      id: makeId(),
      name: "Jogo de panelas antiaderente",
      description: "Preferência por um jogo com 5 peças, cor neutra.",
      link: "",
      links: [],
      maxClaims: 1,
      claims: [],
      taken: false,
      guestName: "",
      guestWhatsapp: "",
      addedAt: now,
      order: now + 0,
      category: "Cozinha",
      featured: false,
      pixKey: "",
      qrCodeImage: ""
    },
    {
      id: makeId(),
      name: "Jogo de toalhas de banho",
      description: "Cores claras, de preferência branco ou bege.",
      link: "",
      links: [],
      maxClaims: 1,
      claims: [],
      taken: false,
      guestName: "",
      guestWhatsapp: "",
      addedAt: now,
      order: now + 1,
      category: "Casa",
      featured: false,
      pixKey: "",
      qrCodeImage: ""
    },
    {
      id: makeId(),
      name: "Air fryer",
      description: "Qualquer marca, capacidade a partir de 4 litros.",
      link: "",
      links: [],
      maxClaims: 1,
      claims: [],
      taken: false,
      guestName: "",
      guestWhatsapp: "",
      addedAt: now,
      order: now + 2,
      category: "Cozinha",
      featured: false,
      pixKey: "",
      qrCodeImage: ""
    },
    {
      id: makeId(),
      name: "Ajude na lua de mel",
      description: "Contribuição livre para a viagem dos noivos.",
      link: "",
      links: [],
      maxClaims: 15,
      claims: [],
      taken: false,
      guestName: "",
      guestWhatsapp: "",
      addedAt: now,
      order: now + 3,
      category: "Lua de mel",
      featured: true,
      pixKey: "marciaematheuscasamento@gmail.com",
      qrCodeImage: "/pix-lua-de-mel.png"
    }
  ];
}

export async function getAllGifts(): Promise<Gift[]> {
  const seeded = await kv.get<string>(SEED_FLAG_KEY);
  if (!seeded) {
    const initial = seedGifts();
    const pipeline = kv.pipeline();
    for (const g of initial) {
      pipeline.hset(HASH_KEY, { [g.id]: JSON.stringify(g) });
    }
    pipeline.set(SEED_FLAG_KEY, "true");
    await pipeline.exec();
    return initial;
  }
  const raw = await kv.hgetall<Record<string, string>>(HASH_KEY);
  if (!raw) return [];
  const gifts = Object.values(raw).map((v) => normalizeGift(typeof v === "string" ? (JSON.parse(v) as Gift) : (v as unknown as Gift)));
  return gifts.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    if (a.addedAt !== b.addedAt) return a.addedAt - b.addedAt;
    return a.id.localeCompare(b.id);
  });
}

export async function getGift(id: string): Promise<Gift | null> {
  const raw = await kv.hget<string>(HASH_KEY, id);
  if (!raw) return null;
  return normalizeGift(typeof raw === "string" ? (JSON.parse(raw) as Gift) : (raw as unknown as Gift));
}

export async function saveGift(gift: Gift): Promise<void> {
  const normalized = normalizeGift(gift);
  await kv.hset(HASH_KEY, { [normalized.id]: JSON.stringify(normalized) });
}

export async function deleteGift(id: string): Promise<void> {
  await kv.hdel(HASH_KEY, id);
}

export async function addGift(input: {
  name: string;
  description: string;
  links: string[];
  maxClaims: number;
  category?: string;
  featured?: boolean;
  pixKey?: string;
  qrCodeImage?: string;
}): Promise<Gift> {
  const links = normalizeLinks(input.links);
  const now = Date.now();
  const gift: Gift = {
    id: makeId(),
    name: input.name.trim(),
    description: (input.description || "").trim(),
    link: links[0] || "",
    links,
    maxClaims: normalizeMaxClaims(input.maxClaims),
    claims: [],
    taken: false,
    guestName: "",
    guestWhatsapp: "",
    addedAt: now,
    // Date.now() is always greater than the small integer order values assigned
    // by reorderGifts(), so newly added gifts naturally land at the end of the
    // list even after the admin has manually reordered everything else.
    order: now,
    category: normalizeCategory(input.category),
    featured: normalizeFeatured(input.featured),
    pixKey: normalizePixKey(input.pixKey),
    qrCodeImage: normalizeQrCodeImage(input.qrCodeImage)
  };
  await saveGift(gift);
  return gift;
}

/**
 * Persists a new manual display order for the gift list, as configured by the
 * admin (e.g. via drag/drag-like reordering in the admin panel). Any existing
 * gift ids not present in `orderedIds` are appended at the end, preserving
 * their previous relative order, so the call is safe even with a stale list.
 */
export async function reorderGifts(orderedIds: string[]): Promise<Gift[]> {
  const raw = await kv.hgetall<Record<string, string>>(HASH_KEY);
  if (!raw) return [];
  const gifts = Object.values(raw).map((v) => normalizeGift(typeof v === "string" ? (JSON.parse(v) as Gift) : (v as unknown as Gift)));
  const byId = new Map(gifts.map((g) => [g.id, g] as const));

  const seen = new Set<string>();
  const idsInOrder: string[] = [];
  for (const id of orderedIds) {
    if (byId.has(id) && !seen.has(id)) {
      seen.add(id);
      idsInOrder.push(id);
    }
  }

  const remaining = gifts
    .filter((g) => !seen.has(g.id))
    .sort((a, b) => (a.order !== b.order ? a.order - b.order : a.addedAt - b.addedAt));

  const finalOrder = [...idsInOrder, ...remaining.map((g) => g.id)];

  const pipeline = kv.pipeline();
  const updatedGifts: Gift[] = [];
  finalOrder.forEach((id, index) => {
    const gift = byId.get(id);
    if (!gift) return;
    const updated: Gift = { ...gift, order: index };
    updatedGifts.push(updated);
    pipeline.hset(HASH_KEY, { [id]: JSON.stringify(updated) });
  });
  await pipeline.exec();

  return updatedGifts;
}

export async function updateGift(
  id: string,
  name: string,
  description: string,
  links: string[],
  maxClaims: number,
  category?: string,
  featured?: boolean,
  pixKey?: string,
  qrCodeImage?: string
): Promise<Gift | null> {
  const current = await getGift(id);
  if (!current) return null;

  const normalizedLinks = normalizeLinks(links);

  const updated: Gift = {
    ...current,
    name: name.trim(),
    description: description.trim(),
    link: normalizedLinks[0] || "",
    links: normalizedLinks,
    maxClaims: normalizeMaxClaims(maxClaims),
    taken: current.claims.length >= normalizeMaxClaims(maxClaims),
    category: category !== undefined ? normalizeCategory(category) : current.category,
    featured: featured !== undefined ? normalizeFeatured(featured) : current.featured,
    pixKey: pixKey !== undefined ? normalizePixKey(pixKey) : current.pixKey,
    qrCodeImage: qrCodeImage !== undefined ? normalizeQrCodeImage(qrCodeImage) : current.qrCodeImage
  };

  await saveGift(updated);
  return updated;
}

/**
 * Best-effort atomic claim: re-reads the gift right before writing to
 * minimize (not fully eliminate) the race window between two guests
 * claiming the same gift at nearly the same moment.
 */
export async function claimGift(
  id: string,
  guestName: string,
  guestWhatsapp: string
): Promise<{ ok: true; gift: Gift } | { ok: false; reason: "not_found" | "already_taken" | "already_claimed" }> {
  const current = await getGift(id);
  if (!current) return { ok: false, reason: "not_found" };
  const normalizedWhatsapp = normalizeWhatsappDigits(guestWhatsapp);
  const alreadyClaimed = current.claims.some((claim) => normalizeWhatsappDigits(claim.guestWhatsapp) === normalizedWhatsapp);
  if (alreadyClaimed) return { ok: false, reason: "already_claimed" };
  if (current.claims.length >= current.maxClaims) return { ok: false, reason: "already_taken" };
  const newClaim: GiftClaim = {
    guestName: guestName.trim(),
    guestWhatsapp: guestWhatsapp.trim(),
    claimedAt: Date.now()
  };
  const claims = [...current.claims, newClaim];
  const updated: Gift = {
    ...current,
    claims,
    taken: claims.length >= current.maxClaims,
    guestName: newClaim.guestName,
    guestWhatsapp: newClaim.guestWhatsapp,
    claimedAt: newClaim.claimedAt
  };
  await saveGift(updated);
  return { ok: true, gift: updated };
}

export async function releaseGift(id: string): Promise<Gift | null> {
  const current = await getGift(id);
  if (!current) return null;
  const updated: Gift = {
    ...current,
    taken: false,
    claims: [],
    guestName: "",
    guestWhatsapp: "",
    claimedAt: undefined
  };
  await saveGift(updated);
  return updated;
}

/**
 * Returns the admin-configured display order for categories. Only category
 * names explicitly placed by an admin (via saveCategoryOrder) live here —
 * use sortCategories() to merge this with whatever categories actually exist
 * on gifts right now.
 */
export async function getCategoryOrder(): Promise<string[]> {
  const raw = await kv.get<string[] | string>(CATEGORY_ORDER_KEY);
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((c): c is string => typeof c === "string");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Persists a new manual display order for categories, as configured by the
 * admin (e.g. via arrow-based reordering in the admin panel).
 */
export async function saveCategoryOrder(order: string[]): Promise<string[]> {
  const cleaned = Array.from(new Set(order.map((c) => c.trim()).filter(Boolean)));
  await kv.set(CATEGORY_ORDER_KEY, JSON.stringify(cleaned));
  return cleaned;
}

/**
 * Orders a list of category names (typically the distinct categories found
 * among current gifts) according to the admin-configured order. Categories
 * that exist but haven't been explicitly placed yet are appended at the end,
 * in order of first appearance, so new categories don't get lost.
 */
export function sortCategories(categories: string[], order: string[]): string[] {
  const distinct = Array.from(new Set(categories.map((c) => c.trim()).filter(Boolean)));
  const positioned = order.filter((c) => distinct.includes(c));
  const remaining = distinct.filter((c) => !positioned.includes(c));
  return [...positioned, ...remaining];
}

export async function releaseGiftClaim(id: string, guestWhatsapp: string): Promise<Gift | null> {
  const current = await getGift(id);
  if (!current) return null;

  const normalizedWhatsapp = normalizeWhatsappDigits(guestWhatsapp);
  const claims = current.claims.filter((claim) => normalizeWhatsappDigits(claim.guestWhatsapp) !== normalizedWhatsapp);
  if (claims.length === current.claims.length) return current;

  const latestClaim = claims[claims.length - 1];
  const updated: Gift = {
    ...current,
    claims,
    taken: claims.length >= current.maxClaims,
    guestName: latestClaim ? latestClaim.guestName : "",
    guestWhatsapp: latestClaim ? latestClaim.guestWhatsapp : "",
    claimedAt: latestClaim ? latestClaim.claimedAt : undefined
  };

  await saveGift(updated);
  return updated;
}
