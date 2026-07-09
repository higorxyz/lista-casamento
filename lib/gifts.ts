import { Redis } from "@upstash/redis";
import { Gift } from "./types";

const kv = Redis.fromEnv();

// All gifts are stored as a single Redis hash: field = gift id, value = JSON string.
const HASH_KEY = "gifts";
const SEED_FLAG_KEY = "gifts:seeded";

function makeId(): string {
  return "gift_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
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

function normalizeGift(raw: Partial<Gift> & { links?: unknown; link?: unknown }): Gift {
  const links = normalizeLinks(raw.links ?? raw.link);
  const primaryLink = links[0] || (typeof raw.link === "string" ? raw.link.trim() : "");

  return {
    id: String(raw.id || makeId()),
    name: String(raw.name || "").trim(),
    description: String(raw.description || "").trim(),
    link: primaryLink,
    links,
    taken: Boolean(raw.taken),
    guestName: String(raw.guestName || "").trim(),
    guestWhatsapp: String(raw.guestWhatsapp || "").trim(),
    addedAt: typeof raw.addedAt === "number" ? raw.addedAt : Date.now(),
    claimedAt: typeof raw.claimedAt === "number" ? raw.claimedAt : undefined
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
      taken: false,
      guestName: "",
      guestWhatsapp: "",
      addedAt: now
    },
    {
      id: makeId(),
      name: "Jogo de toalhas de banho",
      description: "Cores claras, de preferência branco ou bege.",
      link: "",
      links: [],
      taken: false,
      guestName: "",
      guestWhatsapp: "",
      addedAt: now
    },
    {
      id: makeId(),
      name: "Air fryer",
      description: "Qualquer marca, capacidade a partir de 4 litros.",
      link: "",
      links: [],
      taken: false,
      guestName: "",
      guestWhatsapp: "",
      addedAt: now
    },
    {
      id: makeId(),
      name: "Ajude na lua de mel",
      description: "Contribuição livre para a viagem dos noivos.",
      link: "",
      links: [],
      taken: false,
      guestName: "",
      guestWhatsapp: "",
      addedAt: now
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

export async function addGift(input: { name: string; description: string; links: string[] }): Promise<Gift> {
  const links = normalizeLinks(input.links);
  const gift: Gift = {
    id: makeId(),
    name: input.name.trim(),
    description: (input.description || "").trim(),
    link: links[0] || "",
    links,
    taken: false,
    guestName: "",
    guestWhatsapp: "",
    addedAt: Date.now()
  };
  await saveGift(gift);
  return gift;
}

export async function updateGift(
  id: string,
  name: string,
  description: string,
  links: string[]
): Promise<Gift | null> {
  const current = await getGift(id);
  if (!current) return null;

  const normalizedLinks = normalizeLinks(links);

  const updated: Gift = {
    ...current,
    name: name.trim(),
    description: description.trim(),
    link: normalizedLinks[0] || "",
    links: normalizedLinks
  };

  await saveGift(updated);
  return updated;
}

/**
 * Best-effort atomic claim: re-reads the gift right before writing to
 * minimize (not fully eliminate) the race window between two guests
 * claiming the same gift at nearly the same moment.
 */
export async function claimGift(id: string, guestName: string, guestWhatsapp: string): Promise<{ ok: true; gift: Gift } | { ok: false; reason: "not_found" | "already_taken" }> {
  const current = await getGift(id);
  if (!current) return { ok: false, reason: "not_found" };
  if (current.taken) return { ok: false, reason: "already_taken" };
  const updated: Gift = {
    ...current,
    taken: true,
    guestName: guestName.trim(),
    guestWhatsapp: guestWhatsapp.trim(),
    claimedAt: Date.now()
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
    guestName: "",
    guestWhatsapp: "",
    claimedAt: undefined
  };
  await saveGift(updated);
  return updated;
}
