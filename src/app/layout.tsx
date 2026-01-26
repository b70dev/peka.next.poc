import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "peka.next",
  description: "Pensionskassen-Verwaltung",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
