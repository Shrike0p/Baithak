import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scene — You Don't Need a Squad",
  description:
    "Find trusted small-group plans, meet the crew, and make real memories in Bangalore.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
