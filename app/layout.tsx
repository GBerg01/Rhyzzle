import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rhyzzle — The Daily Rap Puzzle",
  description:
    "Create a room, send it to the group chat, and vote who cooked. The daily rap puzzle.",
  openGraph: {
    title: "Rhyzzle",
    description: "The daily rap puzzle. Write bars. Vote who cooked.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-50 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
