import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getPlan } from "@/lib/api";
import { planArt } from "@/lib/plan-art";

/**
 * The poster a host actually posts.
 *
 * Separate from opengraph-image, which is a 1200x630 link preview that only
 * ever appears when someone pastes a URL. This is 1080x1920 — the shape of an
 * Instagram or WhatsApp story — and it's the artefact for the case where
 * there's no link to unfurl at all: a screenshot passed around a group chat.
 *
 * It carries the same things the ticket does and nothing more. Never the crew,
 * never the exact address: a poster gets forwarded to people nobody invited,
 * and unlike a link it can't be taken down.
 */
export const contentType = "image/jpeg";

/**
 * Nobody should be asked to send a 2.5MB image to a group chat.
 *
 * ImageResponse only emits lossless PNG, which for a full-bleed photo runs
 * well past that, so it gets re-encoded as JPEG. Quality steps down until the
 * result fits: photos vary enormously, and a fixed quality that works for a
 * flat preset cover blows the budget on a noisy low-light party photo — which
 * is most of them.
 */
const MAX_BYTES = 1_000_000;
const QUALITY_LADDER = [82, 72, 62, 52];

async function toJpegUnder(png: ArrayBuffer): Promise<Buffer> {
  const image = sharp(Buffer.from(png));
  let out = Buffer.alloc(0);
  for (const quality of QUALITY_LADDER) {
    out = await image.jpeg({ quality, mozjpeg: true }).toBuffer();
    if (out.byteLength <= MAX_BYTES) return out;
  }
  return out;
}

const CREAM = "#f5eee1";
const INK = "#161616";
const ORANGE = "#f0621d";

let displayFont: Promise<ArrayBuffer | null> | null = null;

function archivoBlack(): Promise<ArrayBuffer | null> {
  displayFont ??= fetch(
    "https://fonts.gstatic.com/s/archivoblack/v21/HTxqL289NzCGg4MzN6KJ7eW6OYuP_x7yx3A.ttf",
  )
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .catch(() => null);
  return displayFont;
}

export async function GET(_request: Request, ctx: RouteContext<"/plans/[id]/poster">) {
  const { id } = await ctx.params;
  const plan = await getPlan(id).catch(() => null);
  if (!plan) return new Response("Not found", { status: 404 });

  const art = planArt(plan.category, plan.imageUrl);
  const cover = art.image.startsWith("http")
    ? art.image
    : `${process.env.SITE_ORIGIN ?? "http://localhost:3000"}${art.image}`;

  const date = new Date(plan.startsAt);
  const day = date
    .toLocaleDateString("en-IN", { weekday: "long" })
    .toUpperCase();
  const rest = date
    .toLocaleString("en-IN", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })
    .toUpperCase();
  const spotsLeft = Math.max(0, plan.capacity - plan.composition.total);
  const display = await archivoBlack();

  const png = await new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: CREAM,
          padding: 56,
        }}
      >
        {/* The photo carries the top half — a poster is seen at thumb size first */}
        <div
          style={{
            display: "flex",
            position: "relative",
            border: `10px solid ${INK}`,
            boxShadow: `22px 22px 0 ${INK}`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori only renders <img>; next/image has no meaning inside ImageResponse */}
          <img src={cover} alt="" width={948} height={1010} style={{ objectFit: "cover" }} />
          <div
            style={{
              position: "absolute",
              left: -10,
              bottom: 44,
              display: "flex",
              background: ORANGE,
              color: CREAM,
              border: `8px solid ${INK}`,
              padding: "14px 30px",
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: 2,
              fontFamily: display ? "Display" : undefined,
            }}
          >
            {day}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 48, flex: 1 }}>
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: 6,
              color: ORANGE,
            }}
          >
            {plan.neighborhood.toUpperCase()}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 18,
              // Stepped against the field's own 40-character ceiling, so the
              // longest title a host can type still fits on two lines.
              fontSize:
                plan.title.length > 32 ? 74 : plan.title.length > 22 ? 92 : 118,
              lineHeight: 1,
              fontWeight: 900,
              color: INK,
              fontFamily: display ? "Display" : undefined,
            }}
          >
            {plan.title.toUpperCase()}
          </div>

          <div style={{ display: "flex", marginTop: 26, fontSize: 40, fontWeight: 700, color: INK }}>
            {rest}
          </div>

          <div style={{ display: "flex", gap: 14, marginTop: 28, flexWrap: "wrap" }}>
            {plan.vibeTags.slice(0, 3).map((tag) => (
              <div
                key={tag}
                style={{
                  display: "flex",
                  border: `5px solid ${INK}`,
                  padding: "10px 22px",
                  fontSize: 30,
                  fontWeight: 800,
                  color: INK,
                }}
              >
                {tag.toUpperCase()}
              </div>
            ))}
            {plan.vibeTags.length > 3 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 12px",
                  fontSize: 30,
                  fontWeight: 800,
                  color: "#6b6257",
                }}
              >
                +{plan.vibeTags.length - 3}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: "auto",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: `8px solid ${INK}`,
              paddingTop: 32,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#6b6257" }}>
                ASK TO COME
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 46,
                  fontWeight: 900,
                  color: INK,
                  fontFamily: display ? "Display" : undefined,
                }}
              >
                BAITHAK.BUZZ
              </div>
            </div>
            <div
              style={{
                display: "flex",
                background: INK,
                color: CREAM,
                padding: "18px 30px",
                fontSize: 38,
                fontWeight: 900,
                fontFamily: display ? "Display" : undefined,
              }}
            >
              {spotsLeft > 0 ? `${spotsLeft} SPOTS` : "FULL"}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      fonts: display ? [{ name: "Display", data: display, style: "normal", weight: 900 }] : [],
    },
  ).arrayBuffer();

  const jpeg = await toJpegUnder(png);

  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      // Nothing is stored — this is rendered per request. Five minutes at the
      // CDN, then served stale while it re-renders in the background. The one
      // thing on it that moves is the spot count, and a poster five minutes
      // behind on that is not a problem: people are asking to come, not buying
      // a numbered seat.
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
