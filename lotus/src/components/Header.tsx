"use client";

import Link from "next/link";
import Image from "next/image";
import {Tabs} from "@lemonsqueezy/wedges";
import { Sorts_Mill_Goudy } from 'next/font/google'

const sorts_mill_goudy = Sorts_Mill_Goudy({
    weight: ["400"],
    subsets: ["latin"],
})
interface HeaderProps {
    onSettingsClick?: () => void;
    activeTab?: string;
    boosterNumber?: number;
    pickNumber?: number;
}

export default function Header({ onSettingsClick, activeTab = "home", boosterNumber = 1, pickNumber = 1 }: HeaderProps) {
    return (
        <header className="flex items-center justify-between px-4 py-2 border-b border-border">
            <div className="flex items-center gap-3">
                <Image src="/lotus_icon.png" alt="Logo" width={48} height={48} />
                <span className={`${sorts_mill_goudy.className} text-2xl text-white`}>LOTUS</span>
                <span className="italic text-yellow-500 ml-2" style={{ fontSize: '14px' }}>
                    Booster {boosterNumber} / Pick {pickNumber}
                </span>
            </div>

            <div className="flex items-center gap-4">
                <Tabs variant="fill" value={activeTab}>
                <Tabs.List stretch className="h-10">
                    <Tabs.Trigger asChild value="home">
                        <Link href="/" className="px-4 py-2 text-base font-medium">
                            Home
                        </Link>
                    </Tabs.Trigger>
                    <Tabs.Trigger asChild value="sets">
                        <Link href="/sets" className="px-4 py-2 text-base font-medium">
                            Play
                        </Link>
                    </Tabs.Trigger>
                    <Tabs.Trigger asChild value="test-draft">
                        <Link href="/test-draft" className="px-4 py-2 text-base font-medium">
                            Test
                        </Link>
                    </Tabs.Trigger>
                </Tabs.List>
            </Tabs>

            {onSettingsClick && (
                <button
                    onClick={onSettingsClick}
                    className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                    aria-label="Open Settings"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
            )}
            </div>
        </header>
    );
}
