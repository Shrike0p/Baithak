import type { Metadata } from "next";
import { Archivo_Black, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// globals.css named these faces but nothing ever loaded them, so everyone
// without them installed locally saw system fallbacks — the retro typography
// wasn't actually shipping. next/font self-hosts them and exposes the CSS
// variables globals.css already reads.
const display = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display-loaded",
  display: "swap",
});

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans-loaded",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Baithak — You Don't Need a Squad",
  description:
    "Find trusted small-group plans, meet the crew, and make real memories in Bangalore.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`h-full ${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
