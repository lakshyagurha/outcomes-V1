import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { ProgramsProvider } from "@/components/programs-provider";
import { getPrograms } from "@/lib/programs";

export const metadata: Metadata = {
  title: "Outcomes",
  description: "Know what to apply to, and get in.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F4F4F6" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh font-sans">
        <ProgramsProvider programs={await getPrograms()}>
          <SiteHeader />
          <main>{children}</main>
        </ProgramsProvider>
      </body>
    </html>
  );
}
