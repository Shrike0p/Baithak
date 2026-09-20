import type { ProfileStrength } from "@baithak/types";

// Server-side renders call apps/api directly. In the browser we use a relative
// URL so the request is same-origin and Next's rewrite proxies it (no CORS).
const API_URL =
  typeof window === "undefined" ? (process.env.API_ORIGIN ?? "http://localhost:3001") : "";

/**
 * apps/api identifies the caller from the Better Auth session cookie.
 *
 * In the browser that cookie rides along automatically (same-origin, via the
 * /api rewrite). Server-side there is no browser, so the incoming request's
 * cookies have to be forwarded by hand.
 */
async function authHeaders(): Promise<Record<string, string>> {
  if (typeof window !== "undefined") return {};
  const { cookies } = await import("next/headers");
  const cookie = (await cookies()).toString();
  return cookie ? { cookie } : {};
}

export interface PlanSummary {
  id: string;
  status?: string;
  title: string;
  category: string;
  vibeTags: string[];
  neighborhood: string;
  imageUrl: string | null;
  startsAt: string;
  capacity: number;
  confirmedCount: number;
  host: { id: string; name: string; image: string | null; trustScore: number };
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

export interface Memory {
  id: string;
  url: string;
  caption: string | null;
  takenAt: string | null;
  uploader: string;
  isPublic?: boolean;
  canPublish?: boolean;
  canDelete?: boolean;
}

export interface HappenedPlan {
  id: string;
  title: string;
  category: string;
  vibeTags: string[];
  neighborhood: string;
  startsAt: string;
  imageUrl: string | null;
  host: { id: string; name: string; image: string | null; trustScore: number };
  people: number;
  photoCount: number;
  preview: { id: string; url: string; caption: string | null }[];
  lockedCount: number;
}

export interface PlanDetail extends Omit<PlanSummary, "confirmedCount"> {
  exactAddress: string | null;
  isHost: boolean;
  viewerSignedIn: boolean;
  status: string;
  hasStarted: boolean;
  isAttending: boolean;
  memories: Memory[];
  hiddenMemories: number;
  composition: Composition;
  groupHealth: string[];
  crowd: {
    ageMin: number | null;
    ageMax: number | null;
    targetWomen: number | null;
    targetMen: number | null;
    targetCouples: number | null;
  } | null;
  host: { id: string; name: string; image: string | null; bio: string | null; trustScore: number };
  crew: {
    role: "HOST" | "GUEST";
    firstTime: boolean;
    user: {
      id: string;
      name: string;
      image: string | null;
      age: number | null;
      city: string | null;
      occupation: string | null;
      vibeTags: string[];
      trustScore: number;
    };
  }[];
}

/** Preserves the status and body so callers can act on them (e.g. 422). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: Record<string, unknown> | null,
    path: string
  ) {
    super(`API error ${status} on ${path}`);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...(await authHeaders()), ...init?.headers },
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body, path);
  }
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
  past: PlanSummary[];
}

export interface Social {
  url: string;
  platform: "linkedin" | "instagram" | "x";
  handle: string;
}

export interface Person {
  id: string;
  name: string;
  image: string | null;
  social: Social | null;
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
  host: { id: string; name: string; image: string | null; bio: string | null; trustScore: number };
  isHost: boolean;
  composition: Composition;
  crew: {
    role: "HOST" | "GUEST";
    firstTime: boolean;
    isYou: boolean;
    user: {
      id: string;
      name: string;
      image: string | null;
      age: number | null;
      city: string | null;
      occupation: string | null;
      vibeTags: string[];
      trustScore: number;
      plansAttended: number;
      sharedVibes: string[];
    };
  }[];
  hasStarted: boolean;
  isToday: boolean;
  memories: Memory[];
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
    image: string | null;
    social: Social | null;
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

export interface BlockedPerson {
  id: string;
  name: string;
  image: string | null;
  blockedAt: string;
}

export interface Notification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export function getNotifications() {
  return apiFetch<{ items: Notification[]; unread: number }>("/api/notifications");
}

export interface PersonProfile {
  id: string;
  name: string;
  image: string | null;
  age: number | null;
  city: string | null;
  occupation: string | null;
  bio: string | null;
  vibeTags: string[];
  trustScore: number;
  trustReasons: string[];
  connections: number;
  social: Social | null;
  plansHosted: number;
  plansAttended: number;
  memberSince: string;
  isYou: boolean;
  sharedPlans: number;
  sharedVibes: string[];
  nights: {
    id: string;
    title: string;
    startsAt: string;
    imageUrl: string | null;
    neighborhood: string;
    people: number;
    photos: number;
  }[];
}

export interface PlanReview {
  hostRating: number;
  crowdRating: number;
  vibeRating: number;
  safetyRating: number;
  attendAgain: "YES" | "MAYBE" | "NO";
  privateNote: string | null;
  hangoutAgain: string[];
}

export interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  isYou: boolean;
  sender: { id: string; name: string; image: string | null };
}

export function getMessages(planId: string) {
  return apiFetch<ChatMessage[]>(`/api/plans/${planId}/messages`);
}

export function getMyReview(planId: string) {
  return apiFetch<PlanReview | null>(`/api/plans/${planId}/review`);
}

export function getPerson(id: string) {
  return apiFetch<PersonProfile>(`/api/people/${id}`);
}

export function getBlocks() {
  return apiFetch<BlockedPerson[]>("/api/blocks");
}

export function getHappenedPlans() {
  return apiFetch<HappenedPlan[]>("/api/plans/happened");
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

export interface Me {
  id: string;
  name: string;
  email: string;
  image: string | null;
  socialUrl: string | null;
  age: number | null;
  city: string | null;
  occupation: string | null;
  gender: string | null;
  bio: string | null;
  vibeTags: string[];
  trustScore: number;
  onboardedAt: string | null;
  strength: ProfileStrength;
  _count: { hostedPlans: number; attendances: number };
}

export function getMe() {
  return apiFetch<Me>("/api/me");
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
