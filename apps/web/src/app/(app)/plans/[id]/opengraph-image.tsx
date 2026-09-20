import { ImageResponse } from "next/og";
import { getPlan } from "@/lib/api";
import { planArt } from "@/lib/plan-art";

export const alt = "A Baithak party invite";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CREAM = "#f5eee1";
const INK = "#161616";
const ORANGE = "#f0621d";
const PURPLE = "#7e5de0";

/**
 * ImageResponse renders with no fonts of its own, so the display face has to
 * arrive as bytes. next/font can't help here — it emits CSS, not a buffer.
 *
 * Fetched from Google's static host and memoised for the life of the server
 * process. A failure falls back to the system sans rather than breaking the
 * preview: a plain ticket beats no ticket.
 */
let displayFont: Promise<ArrayBuffer | null> | null = null;

function archivoBlack(): Promise<ArrayBuffer | null> {
  displayFont ??= fetch(
    "https://fonts.gstatic.com/s/archivoblack/v21/HTxqL289NzCGg4MzN6KJ7eW6OYuP_x7yx3A.ttf",
  )
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .catch(() => null);
  return displayFont;
}

/**
 * The link preview: a torn-stub ticket. Cover photo on the left, the details
 * on the right, perforation down the middle.
 *
 * Everything here is what the host is already advertising — title, area, time,
 * spots. Never the crew, never the exact address: a WhatsApp preview gets
 * forwarded to people who were never invited.
 */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await getPlan(id).catch(() => null);

  if (!plan) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: CREAM,
            color: INK,
            fontSize: 64,
            fontWeight: 800,
          }}
        >
          BAITHAK
        </div>
      ),
      size,
    );
  }

  const art = planArt(plan.category, plan.imageUrl);
  const cover = art.image.startsWith("http")
    ? art.image
    : `${process.env.SITE_ORIGIN ?? "http://localhost:3000"}${art.image}`;

  const when = new Date(plan.startsAt)
    .toLocaleString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    })
    .toUpperCase();

  const spotsLeft = Math.max(0, plan.capacity - plan.composition.total);
  const display = await archivoBlack();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: CREAM,
          padding: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 1080,
            height: 520,
            border: `6px solid ${INK}`,
            background: "#fdf8f0",
            boxShadow: `14px 14px 0 ${INK}`,
          }}
        >
          {/* Stub — the photo half */}
          <div style={{ display: "flex", width: 470, position: "relative" }}>
            <img src={cover} alt="" width={470} height={508} style={{ objectFit: "cover" }} />
            <div
              style={{
                position: "absolute",
                left: 24,
                top: 24,
                display: "flex",
                background: ORANGE,
                color: CREAM,
                border: `4px solid ${INK}`,
                padding: "8px 16px",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: 1,
              }}
            >
              {when}
            </div>
          </div>

          {/* Perforation */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: 28,
              background: INK,
              padding: "14px 0",
              alignItems: "center",
            }}
          >
            {Array.from({ length: 13 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 16,
                  background: CREAM,
                  display: "flex",
                }}
              />
            ))}
          </div>

          {/* Details half */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              padding: "38px 40px",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: 3,
                  color: ORANGE,
                }}
              >
                BAITHAK · YOU&apos;RE INVITED
              </div>

              <div
                style={{
                  display: "flex",
                  marginTop: 18,
                  fontFamily: display ? "Archivo Black" : undefined,
                  fontSize: plan.title.length > 22 ? 56 : 70,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: INK,
                  textTransform: "uppercase",
                }}
              >
                {plan.title}
              </div>

              <div
                style={{
                  display: "flex",
                  marginTop: 22,
                  fontSize: 30,
                  fontWeight: 700,
                  color: INK,
                }}
              >
                {plan.neighborhood}
              </div>

              <div
                style={{
                  display: "flex",
                  marginTop: 10,
                  fontSize: 24,
                  color: "#5a5248",
                }}
              >
                Hosted by {plan.host.name}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "nowrap", overflow: "hidden" }}>
              <div
                style={{
                  display: "flex",
                  border: `4px solid ${INK}`,
                  background: PURPLE,
                  color: CREAM,
                  padding: "10px 18px",
                  fontSize: 22,
                  fontWeight: 800,
                }}
              >
                {spotsLeft > 0 ? `${spotsLeft} SPOTS LEFT` : "FULL"}
              </div>
              {plan.vibeTags.slice(0, 1).map((tag) => (
                <div
                  key={tag}
                  style={{
                    display: "flex",
                    border: `4px solid ${INK}`,
                    padding: "10px 18px",
                    fontSize: 22,
                    fontWeight: 800,
                    color: INK,
                  }}
                >
                  {tag.toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: display
        ? [{ name: "Archivo Black", data: display, style: "normal" as const, weight: 400 as const }]
        : undefined,
    },
  );
}
