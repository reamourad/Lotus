import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lotus Draft Assistant",
  description:
    "Learn how to draft with Lotus",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html lang="en" className={`dark h-full`}>
      <body className="bg-lotus-bg text-white">
      <Header />
        <main>{children}</main>
      </body>
      </html>
  );
}
