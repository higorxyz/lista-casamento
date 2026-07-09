import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteGift, getGift, releaseGift, releaseGiftClaim, saveGift, updateGift } from "@/lib/gifts";
import { ADMIN_COOKIE, isValidSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function parseLinksPayload(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function parseMaxClaims(value: unknown, fallback = 1): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
}

function requireAdmin(): boolean {
  return isValidSessionToken(cookies().get(ADMIN_COOKIE)?.value);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!requireAdmin()) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));

  if (body.release === true) {
    const updated = await releaseGift(params.id);
    if (!updated) return NextResponse.json({ error: "Presente não encontrado." }, { status: 404 });
    return NextResponse.json({ gift: updated });
  }

  if (body.releaseClaim === true) {
    const guestWhatsapp = typeof body.guestWhatsapp === "string" ? body.guestWhatsapp.trim() : "";
    if (!guestWhatsapp) {
      return NextResponse.json({ error: "WhatsApp do convidado obrigatório." }, { status: 400 });
    }
    const updated = await releaseGiftClaim(params.id, guestWhatsapp);
    if (!updated) return NextResponse.json({ error: "Presente não encontrado." }, { status: 404 });
    return NextResponse.json({ gift: updated });
  }

  const current = await getGift(params.id);
  if (!current) return NextResponse.json({ error: "Presente não encontrado." }, { status: 404 });

  const parsedLinks = parseLinksPayload(body.links ?? body.link);

  const updated = {
    ...current,
    name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : current.name,
    description: typeof body.description === "string" ? body.description : current.description,
    links: parsedLinks.length ? parsedLinks : current.links,
    link: parsedLinks.length ? parsedLinks[0] : current.link,
    maxClaims: body.maxClaims !== undefined ? parseMaxClaims(body.maxClaims, current.maxClaims) : current.maxClaims,
    taken: current.claims.length >= (body.maxClaims !== undefined ? parseMaxClaims(body.maxClaims, current.maxClaims) : current.maxClaims)
  };
  await saveGift(updated);
  return NextResponse.json({ gift: updated });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!requireAdmin()) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description : "";
  const links = parseLinksPayload(body.links ?? body.link);
  const maxClaims = parseMaxClaims(body.maxClaims, 1);

  if (!name) {
    return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });
  }

  const updated = await updateGift(params.id, name, description, links, maxClaims);
  if (!updated) return NextResponse.json({ error: "Presente não encontrado." }, { status: 404 });

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!requireAdmin()) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  await deleteGift(params.id);
  return NextResponse.json({ ok: true });
}
