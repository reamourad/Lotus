import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Image from "next/image";


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
      <div className="absolute inset-0 -z-10 opacity-90">
          <Image
              src="/gradient.png"
              alt="Background blob"
              fill
              className="object-cover blur-3xl"
              priority
          />
      </div>
        <main>{children}</main>
      </body>
      </html>
  );
}
