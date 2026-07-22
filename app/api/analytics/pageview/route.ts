import { NextRequest, NextResponse } from "next/server";
import { trackPageview } from "@/lib/analytics";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  // Generous limit: this fires once per real page load, so 30/min per IP
  // only ever trips on scripted spam, never on a normal guest.
  const rl = await checkRateLimit(`pageview:${ip}`, 30, 60);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  await trackPageview();
  return NextResponse.json({ ok: true });
}
