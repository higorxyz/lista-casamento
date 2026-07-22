export interface GiftClaim {
  guestName: string;
  guestWhatsapp: string;
  claimedAt: number;
}

export interface Gift {
  id: string;
  name: string;
  description: string;
  link: string;
  links: string[];
  maxClaims: number;
  claims: GiftClaim[];
  taken: boolean;
  guestName: string;
  guestWhatsapp: string;
  addedAt: number;
  claimedAt?: number;
  order: number;
  category: string;
  featured: boolean;
  pixKey: string;
  qrCodeImage: string;
}

// Shape returned to guests (never leaks who claimed a gift)
export interface PublicGift {
  id: string;
  name: string;
  description: string;
  link: string;
  links: string[];
  maxClaims: number;
  claimedCount: number;
  taken: boolean;
  addedAt: number;
  order: number;
  category: string;
  featured: boolean;
  pixKey: string;
  qrCodeImage: string;
}

export function toPublicGift(g: Gift): PublicGift {
  const claimedCount = g.claims.length;
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    link: g.link,
    links: g.links,
    maxClaims: g.maxClaims,
    claimedCount,
    taken: g.taken,
    addedAt: g.addedAt,
    order: g.order,
    category: g.category,
    featured: g.featured,
    pixKey: g.pixKey,
    qrCodeImage: g.qrCodeImage
  };
}
