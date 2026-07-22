import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isValidPassword, makeSessionToken } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  // 5 tentativas de senha a cada 10 minutos por IP, para dificultar brute-force.
  const rl = await checkRateLimit(`admin-login:${ip}`, 5, 600);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!isValidPassword(password)) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, makeSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14 // 14 dias
  });
  return res;
}
