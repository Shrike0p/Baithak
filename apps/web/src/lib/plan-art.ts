// Preset covers. Hosts pick one of these until real uploads exist (needs blob
// storage — see docs/PRODUCT_PLAN.md open decisions).
export const COVER_PRESETS = [
  { url: "/assets/house-party.jpg", label: "House party" },
  { url: "/assets/rooftop-drinks.jpg", label: "Rooftop" },
  { url: "/assets/game-night.jpg", label: "Game night" },
  { url: "/assets/dinner-party.jpg", label: "Dinner" },
];

const BY_CATEGORY: Record<string, { image: string; tone: string }> = {
  HOUSE_PARTY: { image: "/assets/house-party.jpg", tone: "bg-primary" },
  DRINKS: { image: "/assets/rooftop-drinks.jpg", tone: "bg-secondary" },
  GAME_NIGHT: { image: "/assets/game-night.jpg", tone: "bg-accent" },
  DINNER: { image: "/assets/dinner-party.jpg", tone: "bg-primary" },
};

const FALLBACK = { image: "/assets/house-party.jpg", tone: "bg-secondary" };

/** The host's chosen cover wins; category art is only the fallback. */
export function planArt(category: string, imageUrl?: string | null) {
  const base = BY_CATEGORY[category] ?? FALLBACK;
  return imageUrl ? { ...base, image: imageUrl } : base;
}
