export interface Gift {
  id: string;
  name: string;
  description: string;
  link: string;
  links: string[];
  taken: boolean;
  guestName: string;
  guestWhatsapp: string;
  addedAt: number;
  claimedAt?: number;
}

// Shape returned to guests (never leaks who claimed a gift)
export interface PublicGift {
  id: string;
  name: string;
  description: string;
  link: string;
  links: string[];
  taken: boolean;
  addedAt: number;
}

export function toPublicGift(g: Gift): PublicGift {
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    link: g.link,
    links: g.links,
    taken: g.taken,
    addedAt: g.addedAt
  };
}
