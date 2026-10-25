export interface User {
  id: string;
  name: string;
  age: number;
  city: string;
  trustScore: number;
}

export interface Plan {
  id: string;
  title: string;
  category: "house-party" | "drinks" | "dinner" | "game-night" | "trip" | "other";
  neighborhood: string;
  startsAt: string;
  capacity: number;
  confirmedCount: number;
  hostId: string;
}

export interface TrustSignal {
  phoneVerified: boolean;
  socialVerified: boolean;
  plansAttended: number;
  plansHosted: number;
  mutualConnections: number;
}
export * from "./areas";
export * from "./rsvp";
export * from "./profile";
export * from "./trust";
export * from "./chip-in";
export * from "./contact";
