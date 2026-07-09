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

export async function GET() {
  const gifts = await getAllGifts();
  const isAdmin = isValidSessionToken(cookies().get(ADMIN_COOKIE)?.value);
  const payload = isAdmin ? gifts : gifts.map(toPublicGift);
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
    links: parseLinksPayload(body.links ?? body.link)
  });
  return NextResponse.json({ gift });
}
