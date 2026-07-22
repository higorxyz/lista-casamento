import { NextRequest, NextResponse } from "next/server";
import { claimGift } from "@/lib/gifts";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ip = getClientIp(req);
  // 8 claim attempts per 10 minutes per IP is plenty for a real guest (who
  // claims at most a couple of gifts) while blocking scripted spam-claiming.
  const rl = await checkRateLimit(`claim:${ip}`, 8, 600);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente." }, { status: 429 });
  }

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
    if (result.reason === "already_claimed") {
      return NextResponse.json({ error: "Você já escolheu este presente." }, { status: 409 });
    }
    return NextResponse.json({ error: "Esse presente acabou de ser escolhido por outra pessoa." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, giftId: result.gift.id });
}
