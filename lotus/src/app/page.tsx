'use client';

import Header from "@/components/Header";
import Link from "next/link"; // Import Link for navigation

export default function Home() {
  return (
    <>
      <Header activeTab="home" />
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="relative flex place-items-center before:absolute before:h-[300px] before:w-[480px] before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-white before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-[240px] after:translate-x-1/3 after:bg-gradient-conic after:from-sky-200 after:via-blue-200 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-700 before:dark:opacity-10 after:dark:from-sky-900 after:dark:via-[#0141ff] after:dark:opacity-40 before:lg:h-[360px] z-[-1]">
          <h1 className="relative dark:drop-shadow-[0_0_0.3rem_#ffffff70] dark:invert text-6xl font-bold text-center">
            Lotus Draft Assistant
          </h1>
        </div>

        <p className="text-xl text-center mt-8 max-w-2xl">
          Your ultimate companion for practicing Magic: The Gathering booster drafts.
          Hone your skills against AI opponents and refine your deck-building strategies.
        </p>

        <Link href="/sets" passHref>
          <button className="mt-12 px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg shadow-lg hover:bg-blue-700 transition duration-300 ease-in-out">
            Start Drafting
          </button>
        </Link>
      </main>
    </>
  );
}