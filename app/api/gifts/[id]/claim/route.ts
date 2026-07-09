import { NextRequest, NextResponse } from "next/server";
import { claimGift } from "@/lib/gifts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const whatsapp = typeof body?.whatsapp === "string" ? body.whatsapp.trim() : "";
  const digits = whatsapp.replace(/\D/g, "");

  if (!name || !whatsapp || digits.length < 10) {
    return NextResponse.json({ error: "Informe nome e um WhatsApp válido, com DDD." }, { status: 400 });
  }

  const result = await claimGift(params.id, name, whatsapp);

  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "Esse presente não existe mais na lista." }, { status: 404 });
    }
    return NextResponse.json({ error: "Esse presente acabou de ser escolhido por outra pessoa." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, giftId: result.gift.id });
}
