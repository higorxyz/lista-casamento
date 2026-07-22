import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAllGifts } from "@/lib/gifts";
import { getAnalyticsSummary } from "@/lib/analytics";
import { ADMIN_COOKIE, isValidSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = isValidSessionToken(cookies().get(ADMIN_COOKIE)?.value);
  if (!isAdmin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const gifts = await getAllGifts();

  const totalGifts = gifts.length;
  const totalSlots = gifts.reduce((sum, g) => sum + g.maxClaims, 0);
  const claimedSlots = gifts.reduce((sum, g) => sum + g.claims.length, 0);
  const fullyClaimedGifts = gifts.filter((g) => g.taken).length;

  const categoryCounts = new Map<string, number>();
  for (const g of gifts) {
    const key = g.category.trim() || "Sem categoria";
    categoryCounts.set(key, (categoryCounts.get(key) || 0) + 1);
  }

  const pageviews = await getAnalyticsSummary();

  return NextResponse.json({
    totalGifts,
    totalSlots,
    claimedSlots,
    fullyClaimedGifts,
    percentSlotsClaimed: totalSlots > 0 ? Math.round((claimedSlots / totalSlots) * 100) : 0,
    categoryCounts: Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    pageviews
  });
}
