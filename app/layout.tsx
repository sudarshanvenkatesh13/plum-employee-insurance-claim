import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plum Claims Intelligence",
  description: "Trace-first health insurance claims processing system"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
