import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { saveCategoryOrder } from "@/lib/gifts";
import { ADMIN_COOKIE, isValidSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const isAdmin = isValidSessionToken(cookies().get(ADMIN_COOKIE)?.value);
  if (!isAdmin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const orderedCategories = Array.isArray(body?.orderedCategories)
    ? body.orderedCategories.filter((c: unknown) => typeof c === "string")
    : null;

  if (!orderedCategories) {
    return NextResponse.json({ error: "Lista de categorias inválida." }, { status: 400 });
  }

  const categories = await saveCategoryOrder(orderedCategories);
  return NextResponse.json({ categories });
}
