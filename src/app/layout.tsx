import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Entire Judge · Hackathon Project Judging & Assessment Gallery",
  description:
    "Local app that runs the Entire judge plugin on a list of GitHub repositories.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
