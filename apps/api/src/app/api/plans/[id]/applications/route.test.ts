import { beforeEach, describe, expect, it, vi } from "vitest";

/** A host's no stands: re-asking is refused, not silently parked. */

const user = { findUnique: vi.fn() };
const plan = { findUnique: vi.fn() };
const application = { findUnique: vi.fn(), upsert: vi.fn(async () => ({ id: "app_1" })) };
const notify = vi.fn();

vi.mock("@/lib/current-user", () => ({ getCurrentUserId: () => "guest_b" }));
vi.mock("@/lib/notify", () => ({ notify: (n: unknown) => notify(n) }));
vi.mock("@baithak/db", () => ({ prisma: { user, plan, application } }));

const { POST } = await import("./route");

const apply = () =>
  POST({ json: async () => ({ bringingWith: "SOLO" }), headers: new Headers() } as never, {
    params: Promise.resolve({ id: "plan_1" }),
  } as never);

beforeEach(() => {
  vi.clearAllMocks();
  user.findUnique.mockResolvedValue({ name: "Aarav", age: 26, city: "Pune", vibeTags: ["Chill", "Games"] });
  plan.findUnique.mockResolvedValue({
    requiredOfGuests: [],
    rsvpQuestions: [],
    houseRules: null,
    askPhone: false,
    hostId: "host_a",
    title: "House Party",
  });
});

describe("POST /api/plans/:id/applications — asking again", () => {
  it("refuses someone the host passed on or removed, without pinging the host", async () => {
    application.findUnique.mockResolvedValueOnce({ status: "PASSED" });
    const res = await apply();
    expect(res.status).toBe(409);
    expect(application.upsert).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("tells someone already in that they're in", async () => {
    application.findUnique.mockResolvedValueOnce({ status: "ACCEPTED" });
    expect((await apply()).status).toBe(409);
  });

  it("lets a waiting request be updated, but doesn't notify the host twice", async () => {
    application.findUnique.mockResolvedValueOnce({ status: "PENDING" });
    expect((await apply()).status).toBe(201);
    expect(application.upsert).toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("notifies the host for a first request", async () => {
    application.findUnique.mockResolvedValueOnce(null);
    expect((await apply()).status).toBe(201);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ kind: "NEW_APPLICANT", userId: "host_a" }));
  });
});
