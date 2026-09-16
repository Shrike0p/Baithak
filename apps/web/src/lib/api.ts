// Server-side renders call apps/api directly. In the browser we use a relative
// URL so the request is same-origin and Next's rewrite proxies it (no CORS).
const API_URL =
  typeof window === "undefined" ? (process.env.API_ORIGIN ?? "http://localhost:3001") : "";

// ponytail: no auth yet — this id stands in for "the logged in user" across
// every request. Swap for the real Clerk session user id when auth lands.
export const CURRENT_USER_ID = "user_seed_ananya";

export interface PlanSummary {
  id: string;
  title: string;
  category: string;
  vibeTags: string[];
  neighborhood: string;
  imageUrl: string | null;
  startsAt: string;
  capacity: number;
  confirmedCount: number;
  host: { id: string; name: string; trustScore: number };
}

export interface Composition {
  women: number;
  men: number;
  nonBinary: number;
  undisclosed: number;
  firstTimers: number;
  returning: number;
  total: number;
}

export interface PlanDetail extends Omit<PlanSummary, "confirmedCount"> {
  exactAddress: string | null;
  isHost: boolean;
  composition: Composition;
  groupHealth: string[];
  crowd: {
    ageMin: number | null;
    ageMax: number | null;
    targetWomen: number | null;
    targetMen: number | null;
    targetCouples: number | null;
  } | null;
  host: { id: string; name: string; bio: string | null; trustScore: number };
  crew: {
    role: "HOST" | "GUEST";
    firstTime: boolean;
    user: {
      id: string;
      name: string;
      age: number | null;
      city: string | null;
      occupation: string | null;
      vibeTags: string[];
      trustScore: number;
    };
  }[];
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "x-user-id": CURRENT_USER_ID, ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API error ${res.status} on ${path}`);
  return res.json();
}

export function getPlans() {
  return apiFetch<PlanSummary[]>("/api/plans");
}

export function getPlan(id: string) {
  return apiFetch<PlanDetail>(`/api/plans/${id}`);
}

export interface HostedPlan extends PlanSummary {
  pendingApplications: number;
}

export interface MyPlans {
  hosting: HostedPlan[];
  going: PlanSummary[];
  requested: (PlanSummary & { appliedAt: string })[];
}

export interface Person {
  id: string;
  name: string;
  age: number | null;
  city: string | null;
  occupation: string | null;
  vibeTags: string[];
  trustScore: number;
  plansAttended: number;
  plansHosted: number;
  sharedPlans: number;
  reasons: string[];
}

export interface PartyRoom {
  id: string;
  title: string;
  neighborhood: string;
  exactAddress: string | null;
  startsAt: string;
  capacity: number;
  status: string;
  imageUrl: string | null;
  host: { id: string; name: string; bio: string | null; trustScore: number };
  isHost: boolean;
  composition: Composition;
  crew: {
    role: "HOST" | "GUEST";
    firstTime: boolean;
    isYou: boolean;
    user: {
      id: string;
      name: string;
      age: number | null;
      city: string | null;
      occupation: string | null;
      vibeTags: string[];
      trustScore: number;
      plansAttended: number;
      sharedVibes: string[];
    };
  }[];
  memories: {
    id: string;
    url: string;
    caption: string | null;
    takenAt: string | null;
    uploader: string;
  }[];
  previousNights: {
    id: string;
    title: string;
    startsAt: string;
    imageUrl: string | null;
    people: number;
    photos: number;
  }[];
}

export function getPartyRoom(planId: string) {
  return apiFetch<PartyRoom>(`/api/plans/${planId}/room`);
}

export interface Applicant {
  id: string;
  status: "PENDING" | "ACCEPTED" | "PASSED" | "REVIEW_LATER";
  bringingWith: "SOLO" | "ONE_FRIEND" | "GROUP";
  note: string | null;
  createdAt: string;
  score: number;
  reasons: string[];
  bucket: "best" | "good" | "new" | "later";
  mutuals: number;
  returningToThisHost: boolean;
  applicant: {
    id: string;
    name: string;
    age: number | null;
    city: string | null;
    occupation: string | null;
    bio: string | null;
    vibeTags: string[];
    trustScore: number;
    plansAttended: number;
    plansHosted: number;
  };
}

export interface ApplicantQueue {
  plan: {
    id: string;
    title: string;
    neighborhood: string;
    startsAt: string;
    capacity: number;
    imageUrl: string | null;
    vibeTags: string[];
  };
  composition: Composition;
  groupHealth: string[];
  applications: Applicant[];
}

export function getApplicants(planId: string) {
  return apiFetch<ApplicantQueue>(`/api/plans/${planId}/applications`);
}

export function decideApplication(
  applicationId: string,
  status: "ACCEPTED" | "PASSED" | "REVIEW_LATER"
) {
  return apiFetch(`/api/applications/${applicationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export function getMyPlans() {
  return apiFetch<MyPlans>("/api/me/plans");
}

export function getPeople() {
  return apiFetch<{ met: Person[]; suggested: Person[] }>("/api/people");
}

export function createPlan(data: {
  title: string;
  category: string;
  startsAt: string;
  neighborhood: string;
  exactAddress?: string;
  capacity: number;
  vibeTags: string[];
  imageUrl?: string;
  crowd?: {
    ageMin: number;
    ageMax: number;
    targetWomen: number;
    targetMen: number;
    connectionPreference: string;
    preferredVibes: string[];
  };
}) {
  return apiFetch<{ id: string }>("/api/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function applyToPlan(
  id: string,
  data: { bringingWith: "SOLO" | "ONE_FRIEND" | "GROUP"; note?: string }
) {
  return apiFetch(`/api/plans/${id}/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
