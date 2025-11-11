'use client';

import Header from "@/components/Header";

export default function Home() {
  return (
    <>
      <Header activeTab="home" />
      <main>
        <div className="relative h-screen w-screen bg-lotus-bg bg-cover bg-center flex items-center justify-center">
          <img
            src="/gradient.png"
            alt="Logo overlay"
            className="w-full h-[60vh] object-fill"
          />
        </div>
      </main>
    </>
  );
}