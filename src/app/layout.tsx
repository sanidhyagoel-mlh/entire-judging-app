import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Entire Judge",
  description:
    "Local app that runs the Entire judge plugin on a list of GitHub repositories.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
