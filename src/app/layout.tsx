import type { Metadata } from "next";
import "./globals.css";
import { StadiumProvider } from "@/context/StadiumContext";

export const metadata: Metadata = {
  metadataBase: new URL("https://pitch-one-opal.vercel.app"),
  title: "PITCH — Stadium Intelligence Copilot | FIFA World Cup 2026",
  description: "Personalized Intelligent Tournament Companion Hub - AI Control Layer for Stadium Operations. Designed for fans, volunteers, and ops controllers.",
  keywords: ["FIFA World Cup 2026", "Stadium Operations", "AI Wayfinding", "Crowd Intelligence", "GenAI Copilot", "PITCH"],
  openGraph: {
    title: "PITCH — Stadium Intelligence Copilot",
    description: "AI Control Layer for Stadium Operations at FIFA World Cup 2026.",
    url: "https://pitch-one-opal.vercel.app",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col antialiased">
        <StadiumProvider>
          {children}
        </StadiumProvider>
      </body>
    </html>
  );
}

