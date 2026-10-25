import { beforeEach, describe, expect, it, vi } from "vitest";

/** Taking back a yes must take the seat with it; only the host confirms a chip-in. */

const currentUser = vi.fn(() => "host_a");
const application = { findUnique: vi.fn(), update: vi.fn(async (a: { data: Record<string, unknown> }) => a) };
const planAttendee = { deleteMany: vi.fn(async (a: unknown) => a) };
const notify = vi.fn();

vi.mock("@/lib/current-user", () => ({ getCurrentUserId: () => currentUser() }));
vi.mock("@/lib/notify", () => ({ notify: (n: unknown) => notify(n) }));
vi.mock("@baithak/db", () => ({
  prisma: {
    application,
    planAttendee,
    $transaction: async (ops: unknown[]) => Promise.all(ops),
  },
}));

const { PATCH } = await import("./route");

const patch = (body: unknown) =>
  PATCH({ json: async () => body, headers: new Headers() } as never, {
    params: Promise.resolve({ id: "app_1" }),
  } as never);

const accepted = {
  id: "app_1",
  status: "ACCEPTED",
  planId: "plan_1",
  applicantId: "guest_b",
  plan: { id: "plan_1", hostId: "host_a", capacity: 12, title: "House Party", chipIn: 300 },
};

beforeEach(() => {
  vi.clearAllMocks();
  currentUser.mockReturnValue("host_a");
});

describe("PATCH /api/applications/:id — removing an accepted guest", () => {
  it("passes the application AND drops their seat, then tells them", async () => {
    application.findUnique.mockResolvedValueOnce(accepted);
    const res = await patch({ status: "PASSED" });
    expect(res.status).toBe(200);
    expect(planAttendee.deleteMany).toHaveBeenCalledWith({
      where: { planId: "plan_1", userId: "guest_b", role: "GUEST" },
    });
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ kind: "GUEST_REMOVED", userId: "guest_b" }));
  });

  it("won't park someone who's already in back under review", async () => {
    application.findUnique.mockResolvedValueOnce(accepted);
    const res = await patch({ status: "REVIEW_LATER" });
    expect(res.status).toBe(409);
    expect(planAttendee.deleteMany).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/applications/:id — confirming the chip-in", () => {
  it("lets the host mark it paid", async () => {
    application.findUnique.mockResolvedValueOnce(accepted);
    const res = await patch({ paid: true });
    expect(res.status).toBe(200);
    expect(application.update.mock.lastCall?.[0].data.paidConfirmedAt).toBeInstanceOf(Date);
  });

  it("refuses anyone but the host", async () => {
    currentUser.mockReturnValue("guest_b");
    application.findUnique.mockResolvedValueOnce(accepted);
    const res = await patch({ paid: true });
    expect(res.status).toBe(403);
    expect(application.update).not.toHaveBeenCalled();
  });

  it("refuses when there's no chip-in on the plan", async () => {
    application.findUnique.mockResolvedValueOnce({ ...accepted, plan: { ...accepted.plan, chipIn: null } });
    const res = await patch({ paid: true });
    expect(res.status).toBe(409);
  });
});
