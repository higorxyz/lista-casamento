import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAllGifts, addGift } from "@/lib/gifts";
import { toPublicGift } from "@/lib/types";
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

export async function GET(req: NextRequest) {
  const gifts = await getAllGifts();
  const isAdmin = isValidSessionToken(cookies().get(ADMIN_COOKIE)?.value);
  // The public/guest page always calls this without ?view=admin, so it only
  // ever gets the safe PublicGift shape (no guest names/whatsapp numbers),
  // even if the same browser also happens to have a valid admin session.
  // Only the admin dashboard explicitly asks for the full data.
  const wantsAdminView = req.nextUrl.searchParams.get("view") === "admin";
  const sendFull = isAdmin && wantsAdminView;
  const payload = sendFull ? gifts : gifts.map(toPublicGift);
  return NextResponse.json({ gifts: payload, isAdmin });
}

export async function POST(req: NextRequest) {
  const isAdmin = isValidSessionToken(cookies().get(ADMIN_COOKIE)?.value);
  if (!isAdmin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Nome do presente é obrigatório." }, { status: 400 });
  }
  const gift = await addGift({
    name: body.name,
    description: typeof body.description === "string" ? body.description : "",
    links: parseLinksPayload(body.links ?? body.link),
    maxClaims: parseMaxClaims(body.maxClaims, 1),
    category: typeof body.category === "string" ? body.category : "",
    featured: body.featured === true,
    pixKey: typeof body.pixKey === "string" ? body.pixKey : "",
    qrCodeImage: typeof body.qrCodeImage === "string" ? body.qrCodeImage : ""
  });
  return NextResponse.json({ gift });
}
