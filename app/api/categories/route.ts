import { NextResponse } from "next/server";
import { getAllGifts, getCategoryOrder, sortCategories } from "@/lib/gifts";

export const dynamic = "force-dynamic";

// Returns the list of categories currently in use, ordered per the
// admin-configured order. Public endpoint (same trust level as GET
// /api/gifts): category names aren't sensitive and guests need them to
// power the category filter.
export async function GET() {
  const gifts = await getAllGifts();
  const order = await getCategoryOrder();
  const categories = sortCategories(
    gifts.map((g) => g.category),
    order
  );
  return NextResponse.json({ categories });
}
