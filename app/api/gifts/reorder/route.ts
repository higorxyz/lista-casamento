import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { reorderGifts } from "@/lib/gifts";
import { ADMIN_COOKIE, isValidSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const isAdmin = isValidSessionToken(cookies().get(ADMIN_COOKIE)?.value);
  if (!isAdmin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const orderedIds = Array.isArray(body?.orderedIds) ? body.orderedIds.filter((id: unknown) => typeof id === "string") : null;

  if (!orderedIds || orderedIds.length === 0) {
    return NextResponse.json({ error: "Lista de ids inválida." }, { status: 400 });
  }

  const gifts = await reorderGifts(orderedIds);
  return NextResponse.json({ gifts });
}
