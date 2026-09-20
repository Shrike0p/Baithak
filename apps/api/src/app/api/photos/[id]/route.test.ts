import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Who may delete a photo, and who may make one public. Both are decisions
 * about other people's faces, so they get pinned down here rather than
 * trusted to stay correct.
 */

const currentUser = vi.fn();
const photo = { findUnique: vi.fn(), delete: vi.fn(), update: vi.fn() };

vi.mock("@/lib/current-user", () => ({ getCurrentUserId: () => currentUser() }));
vi.mock("@baithak/db", () => ({ prisma: { photo } }));
vi.mock("@/lib/storage", () => ({
  deleteObject: vi.fn(),
  keyFromUrl: () => "memories/p1/x.jpg",
}));

const { DELETE, PATCH } = await import("./route");

const ctx = { params: Promise.resolve({ id: "photo1" }) } as never;
const req = (body?: unknown) =>
  new Request("http://localhost/api/photos/photo1", {
    method: "PATCH",
    body: JSON.stringify(body ?? {}),
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  currentUser.mockResolvedValue("user_me");
  photo.delete.mockResolvedValue({});
  photo.update.mockImplementation(({ data }: { data: { isPublic: boolean } }) => ({
    id: "photo1",
    isPublic: data.isPublic,
  }));
});

describe("DELETE /api/photos/[id]", () => {
  it("lets the uploader delete their own photo", async () => {
    photo.findUnique.mockResolvedValue({
      id: "photo1", url: "u", uploaderId: "user_me", plan: { hostId: "someone" },
    });
    expect((await DELETE(req() as never, ctx)).status).toBe(200);
    expect(photo.delete).toHaveBeenCalled();
  });

  it("lets the host clear anything from their own party", async () => {
    photo.findUnique.mockResolvedValue({
      id: "photo1", url: "u", uploaderId: "a_guest", plan: { hostId: "user_me" },
    });
    expect((await DELETE(req() as never, ctx)).status).toBe(200);
  });

  it("refuses someone who is neither", async () => {
    photo.findUnique.mockResolvedValue({
      id: "photo1", url: "u", uploaderId: "a_guest", plan: { hostId: "someone" },
    });
    expect((await DELETE(req() as never, ctx)).status).toBe(403);
    expect(photo.delete).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/photos/[id] — publishing", () => {
  it("lets the host publish a photo they uploaded themselves", async () => {
    photo.findUnique.mockResolvedValue({ uploaderId: "user_me", plan: { hostId: "user_me" } });
    const res = await PATCH(req({ isPublic: true }), ctx);
    expect(res.status).toBe(200);
    expect((await res.json()).isPublic).toBe(true);
  });

  it("refuses the host publishing a guest's photo", async () => {
    photo.findUnique.mockResolvedValue({ uploaderId: "a_guest", plan: { hostId: "user_me" } });
    expect((await PATCH(req({ isPublic: true }), ctx)).status).toBe(403);
    expect(photo.update).not.toHaveBeenCalled();
  });

  it("refuses a guest publishing their own photo — it isn't their party", async () => {
    photo.findUnique.mockResolvedValue({ uploaderId: "user_me", plan: { hostId: "the_host" } });
    expect((await PATCH(req({ isPublic: true }), ctx)).status).toBe(403);
  });

  it("can put a photo back to private", async () => {
    photo.findUnique.mockResolvedValue({ uploaderId: "user_me", plan: { hostId: "user_me" } });
    const res = await PATCH(req({ isPublic: false }), ctx);
    expect((await res.json()).isPublic).toBe(false);
  });
});
