import { describe, expect, it } from "vitest";
import { parseSocial } from "./social";

/** What we will and won't store as someone's one social link. */
describe("parseSocial", () => {
  it("accepts LinkedIn, Instagram and X", () => {
    expect(parseSocial("https://linkedin.com/in/prakhar")?.platform).toBe("linkedin");
    expect(parseSocial("https://www.instagram.com/prakhar")?.platform).toBe("instagram");
    expect(parseSocial("https://x.com/prakhar")?.platform).toBe("x");
    expect(parseSocial("https://twitter.com/prakhar")?.platform).toBe("x");
  });

  it("works without a scheme, the way people actually type it", () => {
    expect(parseSocial("linkedin.com/in/prakhar")?.url).toBe("https://linkedin.com/in/prakhar");
  });

  it("pulls out the handle", () => {
    expect(parseSocial("https://instagram.com/prakhar/")?.handle).toBe("prakhar");
  });

  it("strips tracking params and www, rather than echoing input back", () => {
    expect(parseSocial("https://www.instagram.com/prakhar?igshid=abc123")?.url).toBe(
      "https://instagram.com/prakhar",
    );
  });

  it("refuses domains that aren't on the allowlist", () => {
    expect(parseSocial("https://example.com/prakhar")).toBeNull();
    expect(parseSocial("https://linkedin.com.evil.test/in/prakhar")).toBeNull();
  });

  it("refuses a bare profile-less link", () => {
    expect(parseSocial("https://linkedin.com")).toBeNull();
  });

  it("refuses junk and empties", () => {
    expect(parseSocial("")).toBeNull();
    expect(parseSocial("   ")).toBeNull();
    expect(parseSocial("not a url")).toBeNull();
    expect(parseSocial(null)).toBeNull();
    expect(parseSocial(42)).toBeNull();
  });
});
