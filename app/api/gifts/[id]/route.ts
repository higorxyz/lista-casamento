import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteGift, getGift, releaseGift, saveGift, updateGift } from "@/lib/gifts";
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

  const current = await getGift(params.id);
  if (!current) return NextResponse.json({ error: "Presente não encontrado." }, { status: 404 });

  const parsedLinks = parseLinksPayload(body.links ?? body.link);

  const updated = {
    ...current,
    name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : current.name,
    description: typeof body.description === "string" ? body.description : current.description,
    links: parsedLinks.length ? parsedLinks : current.links,
    link: parsedLinks.length ? parsedLinks[0] : current.link
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

  if (!name) {
    return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });
  }

  const updated = await updateGift(params.id, name, description, links);
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
