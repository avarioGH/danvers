import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DANVERS OS — Personal AI Operating System",
  description: "Your private AI-powered life operating system. Manage life, health, productivity, and goals with intelligence.",
  keywords: ["AI", "Danvers", "productivity", "life management", "personal OS"],
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-grid antialiased">
        <div className="scan-line" />
        {children}
      </body>
    </html>
  );
}
