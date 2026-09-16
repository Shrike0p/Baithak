import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scene API",
  description: "Backend API for Scene",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
